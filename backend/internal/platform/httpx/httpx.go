// Package httpx holds shared HTTP helpers: JSON responses and the {message}
// error envelope the frontend's api-client expects for every non-2xx response.
package httpx

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string { return e.Message }

func NewError(status int, msg string) *APIError { return &APIError{Status: status, Message: msg} }

func BadRequest(msg string) *APIError   { return NewError(http.StatusBadRequest, msg) }
func Unauthorized(msg string) *APIError { return NewError(http.StatusUnauthorized, msg) }
func NotFound(msg string) *APIError     { return NewError(http.StatusNotFound, msg) }
func Conflict(msg string) *APIError     { return NewError(http.StatusConflict, msg) }

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		if err := json.NewEncoder(w).Encode(v); err != nil {
			slog.Error("encode response", "err", err)
		}
	}
}

func NoContent(w http.ResponseWriter) { w.WriteHeader(http.StatusNoContent) }

// Unknown errors become a generic 500; details stay server-side.
func Error(w http.ResponseWriter, err error) {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		JSON(w, apiErr.Status, map[string]string{"message": apiErr.Message})
		return
	}
	slog.Error("unhandled error", "err", err)
	JSON(w, http.StatusInternalServerError, map[string]string{"message": "internal server error"})
}

func Decode(r *http.Request, v any) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return BadRequest("invalid request body")
	}
	return nil
}
