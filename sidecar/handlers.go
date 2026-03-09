package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

func NewHandlerRegistry(cfg *SidecarConfig) map[string]RPCHandler {
	caps := make(map[string]bool)
	for _, c := range cfg.Capabilities {
		caps[c] = true
	}

	registry := make(map[string]RPCHandler)

	if caps[CapTerminal] {
		registry["run_command"] = makeRunCommandHandler(cfg)
	}
	if caps[CapFilesystem] {
		registry["read_file"] = makeReadFileHandler(cfg)
		registry["write_file"] = makeWriteFileHandler(cfg)
		registry["list_directory"] = makeListDirectoryHandler(cfg)
	}
	if caps[CapClipboard] {
		registry["get_clipboard"] = handleGetClipboard
		registry["set_clipboard"] = handleSetClipboard
	}
	if caps[CapScreenshot] {
		registry["capture_screen"] = handleCaptureScreen
	}
	if caps[CapSystemInfo] {
		registry["get_system_info"] = handleGetSystemInfo
	}

	return registry
}

// --- Terminal ---

func makeRunCommandHandler(cfg *SidecarConfig) RPCHandler {
	return func(params map[string]any) (*RPCResult, error) {
		command, _ := params["command"].(string)
		if command == "" {
			return nil, fmt.Errorf("missing required parameter: command")
		}

		cwd, _ := params["cwd"].(string)
		if cwd == "" {
			cwd, _ = os.Getwd()
		}

		timeoutMs := cfg.Terminal.TimeoutMs
		if t, ok := params["timeout"].(float64); ok && t > 0 {
			timeoutMs = int(t)
		}

		for _, blocked := range cfg.Terminal.BlockedCommands {
			if strings.Contains(command, blocked) {
				return &RPCResult{Result: map[string]any{
					"stdout":    "",
					"stderr":    fmt.Sprintf("Command blocked: %s", blocked),
					"exit_code": 1,
				}}, nil
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutMs)*time.Millisecond)
		defer cancel()

		shell := cfg.Terminal.DefaultShell
		var cmd *exec.Cmd
		if shell != "" {
			cmd = exec.CommandContext(ctx, shell, "-c", command)
		} else if runtime.GOOS == "windows" {
			cmd = exec.CommandContext(ctx, "cmd", "/C", command)
		} else {
			cmd = exec.CommandContext(ctx, "sh", "-c", command)
		}
		cmd.Dir = cwd

		var stdoutBuf, stderrBuf strings.Builder
		cmd.Stdout = &stdoutBuf
		cmd.Stderr = &stderrBuf

		err := cmd.Run()
		exitCode := 0
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				exitCode = exitErr.ExitCode()
			} else {
				exitCode = 1
			}
		}

		return &RPCResult{Result: map[string]any{
			"stdout":    stdoutBuf.String(),
			"stderr":    stderrBuf.String(),
			"exit_code": exitCode,
		}}, nil
	}
}

// --- Filesystem ---

func isBlockedPath(filePath string, blockedPaths []string) bool {
	resolved, _ := filepath.Abs(filePath)
	for _, bp := range blockedPaths {
		abs, _ := filepath.Abs(bp)
		if strings.HasPrefix(resolved, abs) {
			return true
		}
	}
	return false
}

func makeReadFileHandler(cfg *SidecarConfig) RPCHandler {
	return func(params map[string]any) (*RPCResult, error) {
		path, _ := params["path"].(string)
		if path == "" {
			return nil, fmt.Errorf("missing required parameter: path")
		}
		if isBlockedPath(path, cfg.Filesystem.BlockedPaths) {
			return nil, fmt.Errorf("path is blocked: %s", path)
		}

		info, err := os.Stat(path)
		if err != nil {
			return nil, err
		}
		if info.Size() > int64(cfg.Filesystem.MaxFileSizeKB)*1024 {
			return nil, fmt.Errorf("file exceeds max size of %dKB", cfg.Filesystem.MaxFileSizeKB)
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		return &RPCResult{Result: map[string]any{"content": string(content)}}, nil
	}
}

func makeWriteFileHandler(cfg *SidecarConfig) RPCHandler {
	return func(params map[string]any) (*RPCResult, error) {
		path, _ := params["path"].(string)
		content, _ := params["content"].(string)
		if path == "" {
			return nil, fmt.Errorf("missing required parameter: path")
		}
		if _, ok := params["content"]; !ok {
			return nil, fmt.Errorf("missing required parameter: content")
		}
		if isBlockedPath(path, cfg.Filesystem.BlockedPaths) {
			return nil, fmt.Errorf("path is blocked: %s", path)
		}

		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return nil, err
		}
		if err := os.WriteFile(path, []byte(content), 0644); err != nil {
			return nil, err
		}
		return &RPCResult{Result: map[string]any{"success": true}}, nil
	}
}

func makeListDirectoryHandler(cfg *SidecarConfig) RPCHandler {
	return func(params map[string]any) (*RPCResult, error) {
		dirPath, _ := params["path"].(string)
		if dirPath == "" {
			return nil, fmt.Errorf("missing required parameter: path")
		}
		if isBlockedPath(dirPath, cfg.Filesystem.BlockedPaths) {
			return nil, fmt.Errorf("path is blocked: %s", dirPath)
		}

		entries, err := os.ReadDir(dirPath)
		if err != nil {
			return nil, err
		}

		results := make([]map[string]any, 0, len(entries))
		for _, entry := range entries {
			entryType := "file"
			if entry.IsDir() {
				entryType = "directory"
			}
			size := int64(0)
			if info, err := entry.Info(); err == nil {
				size = info.Size()
			}
			results = append(results, map[string]any{
				"name": entry.Name(),
				"type": entryType,
				"size": size,
			})
		}
		return &RPCResult{Result: map[string]any{"entries": results}}, nil
	}
}

// --- Clipboard ---

func runCmd(name string, args []string, input string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	if input != "" {
		cmd.Stdin = strings.NewReader(input)
	}
	out, err := cmd.Output()
	return string(out), err
}

func handleGetClipboard(params map[string]any) (*RPCResult, error) {
	var content string
	var err error

	switch runtime.GOOS {
	case "darwin":
		content, err = runCmd("pbpaste", nil, "")
	case "windows":
		content, err = runCmd("powershell", []string{"-command", "Get-Clipboard"}, "")
	default:
		content, err = runCmd("xclip", []string{"-selection", "clipboard", "-o"}, "")
	}
	if err != nil {
		return nil, err
	}
	return &RPCResult{Result: map[string]any{"content": content}}, nil
}

func handleSetClipboard(params map[string]any) (*RPCResult, error) {
	content, _ := params["content"].(string)
	if _, ok := params["content"]; !ok {
		return nil, fmt.Errorf("missing required parameter: content")
	}

	var err error
	switch runtime.GOOS {
	case "darwin":
		_, err = runCmd("pbcopy", nil, content)
	case "windows":
		escaped := strings.ReplaceAll(content, "'", "''")
		_, err = runCmd("powershell", []string{"-command", fmt.Sprintf("Set-Clipboard -Value '%s'", escaped)}, "")
	default:
		_, err = runCmd("xclip", []string{"-selection", "clipboard"}, content)
	}
	if err != nil {
		return nil, err
	}
	return &RPCResult{Result: map[string]any{"success": true}}, nil
}

// --- Screenshot ---

func handleCaptureScreen(params map[string]any) (*RPCResult, error) {
	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("jarvis-screenshot-%d.png", time.Now().UnixMilli()))
	defer os.Remove(tmpFile)

	var err error
	switch runtime.GOOS {
	case "darwin":
		_, err = runCmd("screencapture", []string{"-x", tmpFile}, "")
	case "windows":
		psScript := fmt.Sprintf(
			`Add-Type -AssemblyName System.Windows.Forms; `+
				`[System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { `+
				`$bmp = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); `+
				`$g = [System.Drawing.Graphics]::FromImage($bmp); `+
				`$g.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); `+
				`$bmp.Save('%s') }`, tmpFile)
		_, err = runCmd("powershell", []string{"-command", psScript}, "")
	default:
		// Try scrot, then import, then gnome-screenshot
		_, err = runCmd("scrot", []string{tmpFile}, "")
		if err != nil {
			_, err = runCmd("import", []string{"-window", "root", tmpFile}, "")
			if err != nil {
				_, err = runCmd("gnome-screenshot", []string{"-f", tmpFile}, "")
			}
		}
	}
	if err != nil {
		return nil, fmt.Errorf("screenshot capture failed: %w", err)
	}

	data, err := os.ReadFile(tmpFile)
	if err != nil {
		return nil, err
	}

	return &RPCResult{
		Result: map[string]any{"captured": true},
		Binary: &BinaryDataInline{
			Type:     "inline",
			MimeType: "image/png",
			Data:     base64.StdEncoding.EncodeToString(data),
		},
	}, nil
}

// --- System Info ---

func handleGetSystemInfo(params map[string]any) (*RPCResult, error) {
	hostname, _ := os.Hostname()
	return &RPCResult{Result: map[string]any{
		"hostname": hostname,
		"platform": runtime.GOOS,
		"arch":     runtime.GOARCH,
		"cpus":     runtime.NumCPU(),
		"uptime":   0, // Go stdlib doesn't expose system uptime easily
		"go_version": runtime.Version(),
	}}, nil
}
