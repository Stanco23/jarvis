package main

import (
	"os"
	"path/filepath"
	"testing"
)

func testConfig() *SidecarConfig {
	cfg := defaultConfig()
	return &cfg
}

func TestRunCommand(t *testing.T) {
	handler := makeRunCommandHandler(testConfig())

	t.Run("echo command", func(t *testing.T) {
		result, err := handler(map[string]any{"command": "echo hello"})
		if err != nil {
			t.Fatal(err)
		}
		m := result.Result.(map[string]any)
		if m["exit_code"] != 0 {
			t.Errorf("expected exit_code 0, got %v", m["exit_code"])
		}
		stdout := m["stdout"].(string)
		if stdout != "hello\n" {
			t.Errorf("expected 'hello\\n', got %q", stdout)
		}
	})

	t.Run("missing command", func(t *testing.T) {
		_, err := handler(map[string]any{})
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("blocked command", func(t *testing.T) {
		cfg := testConfig()
		cfg.Terminal.BlockedCommands = []string{"rm -rf"}
		h := makeRunCommandHandler(cfg)
		result, err := h(map[string]any{"command": "rm -rf /"})
		if err != nil {
			t.Fatal(err)
		}
		m := result.Result.(map[string]any)
		if m["exit_code"] != 1 {
			t.Errorf("expected exit_code 1, got %v", m["exit_code"])
		}
	})
}

func TestReadFile(t *testing.T) {
	cfg := testConfig()
	handler := makeReadFileHandler(cfg)

	t.Run("read existing file", func(t *testing.T) {
		tmp := filepath.Join(t.TempDir(), "test.txt")
		os.WriteFile(tmp, []byte("hello world"), 0644)

		result, err := handler(map[string]any{"path": tmp})
		if err != nil {
			t.Fatal(err)
		}
		m := result.Result.(map[string]any)
		if m["content"] != "hello world" {
			t.Errorf("expected 'hello world', got %v", m["content"])
		}
	})

	t.Run("file too large", func(t *testing.T) {
		cfg := testConfig()
		cfg.Filesystem.MaxFileSizeKB = 1 // 1KB
		h := makeReadFileHandler(cfg)

		tmp := filepath.Join(t.TempDir(), "big.txt")
		os.WriteFile(tmp, make([]byte, 2048), 0644) // 2KB

		_, err := h(map[string]any{"path": tmp})
		if err == nil {
			t.Fatal("expected error for oversized file")
		}
	})

	t.Run("blocked path", func(t *testing.T) {
		cfg := testConfig()
		cfg.Filesystem.BlockedPaths = []string{"/etc"}
		h := makeReadFileHandler(cfg)

		_, err := h(map[string]any{"path": "/etc/passwd"})
		if err == nil {
			t.Fatal("expected error for blocked path")
		}
	})
}

func TestWriteFile(t *testing.T) {
	cfg := testConfig()
	handler := makeWriteFileHandler(cfg)

	t.Run("write new file", func(t *testing.T) {
		tmp := filepath.Join(t.TempDir(), "subdir", "test.txt")
		result, err := handler(map[string]any{"path": tmp, "content": "hello"})
		if err != nil {
			t.Fatal(err)
		}
		m := result.Result.(map[string]any)
		if m["success"] != true {
			t.Error("expected success")
		}

		data, _ := os.ReadFile(tmp)
		if string(data) != "hello" {
			t.Errorf("expected 'hello', got %q", string(data))
		}
	})
}

func TestListDirectory(t *testing.T) {
	cfg := testConfig()
	handler := makeListDirectoryHandler(cfg)

	t.Run("list temp dir", func(t *testing.T) {
		dir := t.TempDir()
		os.WriteFile(filepath.Join(dir, "a.txt"), []byte("a"), 0644)
		os.Mkdir(filepath.Join(dir, "subdir"), 0755)

		result, err := handler(map[string]any{"path": dir})
		if err != nil {
			t.Fatal(err)
		}
		m := result.Result.(map[string]any)
		entries := m["entries"].([]map[string]any)
		if len(entries) != 2 {
			t.Errorf("expected 2 entries, got %d", len(entries))
		}
	})
}
