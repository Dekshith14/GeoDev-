# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

The GeoDev team takes security seriously. If you discover a security vulnerability in GeoDev, please follow these guidelines:

1. **Do not create a public issue.**
2. Send an email to `security@geodev.tools` (or report via GitHub Security Advisories).
3. Include details of the vulnerability, steps to reproduce, and impact.
4. We will acknowledge receipt within 48 hours and provide an estimated fix timeline.

## Security Practices

- **Safe Process Spawning**: All process calls use `execFile` / `spawn` with discrete argument arrays rather than shell string interpolation to prevent command injection.
- **Read-Only Operation**: Inspection and diagnostic commands are read-only.
- **Path Traversal Protection**: All paths are resolved and normalized within the project root.
