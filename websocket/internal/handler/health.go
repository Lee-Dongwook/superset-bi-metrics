package handler

import (
	"encoding/json"
	"net/http"
	"time"
)

var startTime = time.Now()

type healthResponse struct {
	Status string `json:"status"`
	Uptime string `json:"uptime"`
}

// HealthCheckHandler handles health check endpoint.
func HealthCheckHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		_ = json.NewEncoder(w).Encode(healthResponse{
			Status: "ok",
			Uptime: time.Since(startTime).Truncate(time.Second).String(),
		})
	}
}
