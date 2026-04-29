FROM python:3.11-slim

WORKDIR /app

# Install curl for downloading products file
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY download-products.sh .
RUN chmod +x download-products.sh

# Expose port
EXPOSE 5002

# Download products file on startup, then run app
CMD ["sh", "-c", "./download-products.sh && python app.py"]
