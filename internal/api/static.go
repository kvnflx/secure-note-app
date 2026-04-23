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
