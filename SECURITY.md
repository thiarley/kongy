# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within Kongy, please send an email to [INSERT SECURITY EMAIL]. All security vulnerabilities will be promptly addressed.

**Please do not report security vulnerabilities through public GitHub issues.**

### What to include

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to expect

- A response acknowledging receipt within 48 hours
- An assessment of the vulnerability within 7 days
- Regular updates on progress
- Credit in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

When deploying Kongy:

1. **Change the SECRET_KEY** - Never use the default in production
2. **Use HTTPS** - Always use TLS in production
3. **Limit CORS origins** - Only allow trusted origins
4. **Network isolation** - Kong Admin API should not be publicly accessible
5. **Regular updates** - Keep Kong and Kongy updated

## Architecture Security

- **In-memory storage**: No database = smaller attack surface
- **JWT tokens**: Stateless authentication, tokens expire
- **Rate limiting**: Protects against brute force attacks
- **Security headers**: CSP, X-Frame-Options, etc.
- **Non-root containers**: Reduced privilege execution
