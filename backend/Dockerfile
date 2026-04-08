FROM python:3.11-slim

WORKDIR /app

ARG PIP_INDEX_URL=
ARG PIP_EXTRA_INDEX_URL=

# Security: Create non-root user
RUN adduser --disabled-password --gecos '' --uid 1000 appuser

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --trusted-host pypi.org \
    --trusted-host pypi.python.org \
    --trusted-host files.pythonhosted.org \
    ${PIP_INDEX_URL:+--index-url $PIP_INDEX_URL} \
    ${PIP_EXTRA_INDEX_URL:+--extra-index-url $PIP_EXTRA_INDEX_URL} \
    -r requirements.txt

# Copy application code
COPY app/ ./app/

# Security: Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
