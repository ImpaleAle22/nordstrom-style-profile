FROM python:3.11-slim

WORKDIR /app

# Install curl for downloading products file
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .

# Hugging Face Spaces requires port 7860
EXPOSE 7860

# Set environment variable for port
ENV PORT=7860

# Run app
CMD ["python", "app.py"]
