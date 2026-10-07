// Command server runs the API. Wiring only; excluded from coverage (specs/testing.md §4).
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/Justin-Medas/angular-interop-poc/api/internal/config"
	"github.com/Justin-Medas/angular-interop-poc/api/internal/server"
)

func main() {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("listening on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, server.New(cfg)))
}
