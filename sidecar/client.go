package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"runtime"
	"time"

	"nhooyr.io/websocket"
)

const (
	minReconnectDelay = 1 * time.Second
	maxReconnectDelay = 60 * time.Second
)

type SidecarClient struct {
	config         *SidecarConfig
	claims         *SidecarTokenClaims
	handlers       map[string]RPCHandler
	conn           *websocket.Conn
	reconnectDelay time.Duration
	stopped        bool
}

func NewSidecarClient(config *SidecarConfig) (*SidecarClient, error) {
	claims, err := DecodeJWTPayload(config.Token)
	if err != nil {
		return nil, fmt.Errorf("decode token: %w", err)
	}

	return &SidecarClient{
		config:         config,
		claims:         claims,
		handlers:       NewHandlerRegistry(config),
		reconnectDelay: minReconnectDelay,
	}, nil
}

func (c *SidecarClient) Start(ctx context.Context) {
	c.stopped = false
	for !c.stopped {
		err := c.connectAndServe(ctx)
		if c.stopped {
			return
		}
		if err != nil {
			log.Printf("[sidecar] Disconnected: %v", err)
		}
		log.Printf("[sidecar] Reconnecting in %s...", c.reconnectDelay)
		select {
		case <-time.After(c.reconnectDelay):
		case <-ctx.Done():
			return
		}
		c.reconnectDelay = min(c.reconnectDelay*2, maxReconnectDelay)
	}
}

func (c *SidecarClient) Stop() {
	c.stopped = true
	if c.conn != nil {
		c.conn.Close(websocket.StatusNormalClosure, "client shutdown")
		c.conn = nil
	}
}

func (c *SidecarClient) connectAndServe(ctx context.Context) error {
	url := fmt.Sprintf("%s?token=%s", c.claims.Brain, c.config.Token)
	log.Printf("[sidecar] Connecting to %s...", c.claims.Brain)

	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	c.conn = conn
	// Allow large messages (10MB)
	conn.SetReadLimit(10 * 1024 * 1024)

	log.Println("[sidecar] Connected")
	c.reconnectDelay = minReconnectDelay

	if err := c.sendRegistration(ctx); err != nil {
		return fmt.Errorf("registration: %w", err)
	}

	// Start observers (clipboard, etc.) — cancelled when connection drops
	obsCtx, obsCancel := context.WithCancel(ctx)
	defer obsCancel()
	StartObservers(obsCtx, c.config, func(ctx context.Context, event SidecarEvent) error {
		return c.sendJSON(ctx, event)
	})

	return c.readLoop(ctx)
}

func (c *SidecarClient) sendRegistration(ctx context.Context) error {
	hostname, _ := os.Hostname()
	msg := SidecarRegistration{
		Type:         "register",
		Hostname:     hostname,
		OS:           runtime.GOOS,
		Platform:     runtime.GOARCH,
		Capabilities: c.config.Capabilities,
	}
	log.Printf("[sidecar] Identified as %s (%s/%s)", msg.Hostname, msg.OS, msg.Platform)
	return c.sendJSON(ctx, msg)
}

func (c *SidecarClient) readLoop(ctx context.Context) error {
	for {
		_, data, err := c.conn.Read(ctx)
		if err != nil {
			return err
		}

		var req RPCRequest
		if err := json.Unmarshal(data, &req); err != nil {
			log.Printf("[sidecar] Invalid JSON received")
			continue
		}
		if req.Type != "rpc_request" {
			continue
		}

		log.Printf("[sidecar] RPC %s: %s", req.ID, req.Method)

		handler, ok := c.handlers[req.Method]
		if !ok {
			c.sendResult(ctx, req.ID, nil, &rpcError{Code: "METHOD_NOT_FOUND", Message: fmt.Sprintf("Unknown method: %s", req.Method)})
			continue
		}

		// Run handler in goroutine to not block the read loop
		go func(id string, h RPCHandler, params map[string]any) {
			result, err := h(params)
			if err != nil {
				c.sendResult(ctx, id, nil, &rpcError{Code: "HANDLER_ERROR", Message: err.Error()})
				return
			}
			c.sendResult(ctx, id, result, nil)
		}(req.ID, handler, req.Params)
	}
}

type rpcError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (c *SidecarClient) sendResult(ctx context.Context, rpcID string, result *RPCResult, rpcErr *rpcError) {
	payload := map[string]any{"rpc_id": rpcID}
	if rpcErr != nil {
		payload["error"] = rpcErr
	} else if result != nil {
		payload["result"] = result.Result
	}

	event := SidecarEvent{
		Type:      "rpc_result",
		EventType: "rpc_result",
		Timestamp: time.Now().UnixMilli(),
		Payload:   payload,
	}
	if result != nil && result.Binary != nil {
		event.Binary = result.Binary
	}

	c.sendJSON(ctx, event)
}

func (c *SidecarClient) sendJSON(ctx context.Context, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	if c.conn == nil {
		return fmt.Errorf("not connected")
	}
	return c.conn.Write(ctx, websocket.MessageText, data)
}

// sendBinary writes a binary WS frame: [36-byte refId][raw data].
func (c *SidecarClient) sendBinary(ctx context.Context, refId string, data []byte) error {
	if c.conn == nil {
		return fmt.Errorf("not connected")
	}
	frame := make([]byte, 36+len(data))
	copy(frame[:36], []byte(refId))
	copy(frame[36:], data)
	return c.conn.Write(ctx, websocket.MessageBinary, frame)
}

// sendEvent sends a sidecar event, using binary ref protocol for large binary payloads (>=256KB).
func (c *SidecarClient) sendEvent(ctx context.Context, event SidecarEvent, binaryData []byte) error {
	const binaryRefThreshold = 256 * 1024

	if len(binaryData) > 0 && len(binaryData) >= binaryRefThreshold {
		// Use binary ref protocol: send JSON with ref, then binary frame
		refId := fmt.Sprintf("%s-%d", event.EventType, event.Timestamp)
		// Pad/truncate to 36 bytes
		if len(refId) > 36 {
			refId = refId[:36]
		}
		for len(refId) < 36 {
			refId += "0"
		}

		event.Binary = &BinaryDataInline{
			Type:     "ref",
			MimeType: "image/png",
			Data:     refId, // repurpose Data field as ref_id for ref type
		}

		if err := c.sendJSON(ctx, event); err != nil {
			return err
		}
		return c.sendBinary(ctx, refId, binaryData)
	}

	if len(binaryData) > 0 {
		// Inline as base64
		event.Binary = &BinaryDataInline{
			Type:     "inline",
			MimeType: "image/png",
			Data:     base64Encode(binaryData),
		}
	}

	return c.sendJSON(ctx, event)
}

func base64Encode(data []byte) string {
	return base64.StdEncoding.EncodeToString(data)
}
