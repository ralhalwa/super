FROM golang:1.24-alpine

RUN apk add --no-cache gcc musl-dev

RUN go install github.com/air-verse/air@v1.61.7

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 go build -o server ./cmd/api/

CMD ["air", "-c", ".air.toml"]
