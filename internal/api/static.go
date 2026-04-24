package api

import (
	"io/fs"
	"net/http"
)

// StaticHandler serves files from a sub-filesystem rooted at "web-assets".
func StaticHandler(root fs.FS) (http.Handler, error) {
	sub, err := fs.Sub(root, "web-assets")
	if err != nil {
		return nil, err
	}
	return http.FileServer(http.FS(sub)), nil
}

// SPAShellBytes reads the Vite-built index.html out of the embedded
// filesystem. It is the canonical shell for client-rendered routes, since
// it carries the hashed asset URLs produced by the build.
func SPAShellBytes(root fs.FS) ([]byte, error) {
	sub, err := fs.Sub(root, "web-assets")
	if err != nil {
		return nil, err
	}
	return fs.ReadFile(sub, "index.html")
}
