# Contributing to Kongy

First off, thank you for considering contributing to Kongy! 🎉

## How Can I Contribute?

### Reporting Bugs

- Use the GitHub issue tracker
- Check if the issue already exists
- Include detailed steps to reproduce
- Include your environment (OS, Docker version, Kong version)

### Suggesting Features

- Open an issue with the `enhancement` label
- Explain the use case and why it would be useful
- Be open to discussion

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Test your changes** - run the test suite
3. **Follow the code style** - we use consistent formatting
4. **Write meaningful commits** - one feature/fix per commit
5. **Update documentation** if needed
6. **Open a Pull Request** with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/kongy.git
cd kongy

# Start development environment
docker compose up -d

# Backend development
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest  # Run tests

# Frontend development  
cd frontend
# Serve with any static server
python -m http.server 8080
```

## Code Style

### Python (Backend)

- Follow PEP 8
- Use type hints
- Run `ruff check` and `black .` before committing

### JavaScript (Frontend)

- Use ES6+ features
- Use JSDoc comments for functions
- Keep functions small and focused

## Commit Messages

Use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

Example: `feat: add batch plugin application`

## Questions?

Feel free to open an issue with the `question` label!

---

Thank you for contributing! 🦍
