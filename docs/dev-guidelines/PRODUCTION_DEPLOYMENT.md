# Production Deployment Guide

This guide provides step-by-step instructions for deploying the Peer Evaluation App to production on AWS, Azure, or Google Cloud Platform. Follow these instructions carefully to ensure a secure deployment.

## 🎯 Overview

The Peer Evaluation App consists of:
- **Flask Backend**: Python REST API with JWT authentication (port 5000)
- **React Frontend**: Vite-based SPA (served via Nginx)
- **PostgreSQL Database**: Production data storage

**Important**: Secrets are NEVER baked into Docker images. They are injected at runtime via environment variables from cloud secret managers.

---

## ⚠️ Critical Security Requirements

### 1. Understanding Secret Management

**❌ NEVER DO THIS:**
- Hard-code secrets in source code
- Commit `.env` files to git
- Bake secrets into Docker images using `ENV` directives
- Share secrets via email or chat

**✅ ALWAYS DO THIS:**
- Use cloud provider secret managers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)
- Pass secrets as environment variables at container runtime
- Rotate secrets regularly
- Use separate secrets for dev/staging/production

### 2. Required Environment Variables

The Flask backend **requires** these environment variables in production:

```bash
# Enable production mode - this automatically enables secure JWT settings
FLASK_ENV=production

# CRITICAL: Set a strong, random secret key (use a cryptographically secure random string)
SECRET_KEY=<your-secure-random-secret-key-here>

# CRITICAL: Set a strong JWT secret key (different from SECRET_KEY)
JWT_SECRET_KEY=<your-secure-random-jwt-secret-key>

# Database connection string for production PostgreSQL
DATABASE_URL=postgresql://username:password@hostname:5432/database_name

# CORS origins (comma-separated list of allowed frontend URLs)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional: Set JWT cookie domain if deploying across subdomains
JWT_COOKIE_DOMAIN=.yourdomain.com
```

**Note**: The Flask app will **crash on startup** if `SECRET_KEY`, `JWT_SECRET_KEY`, or `DATABASE_URL` are missing in production mode.

#### How Production Mode Affects JWT Settings

When `FLASK_ENV=production` or `PRODUCTION=true` is set, the application automatically configures:

| Setting | Development | Production | Purpose |
|---------|-------------|------------|---------|
| `JWT_COOKIE_SECURE` | `False` | `True` | Requires HTTPS for cookie transmission |
| `JWT_COOKIE_CSRF_PROTECT` | `False` | `True` | Enables CSRF token validation |
| `JWT_COOKIE_SAMESITE` | `Lax` | `Strict` | Maximum protection against CSRF attacks |

### 2. HTTPS Requirement

**Production deployments MUST use HTTPS.** The `JWT_COOKIE_SECURE=True` setting in production mode ensures cookies are only transmitted over encrypted connections.

- Configure your web server (nginx, Apache) or load balancer to handle SSL/TLS
- Obtain SSL certificates from Let's Encrypt or your certificate authority
- Ensure all HTTP traffic is redirected to HTTPS

### 3. CSRF Protection

With `JWT_COOKIE_CSRF_PROTECT=True` in production, the application will:

- Generate CSRF tokens and include them in cookies
- Require CSRF tokens in request headers for state-changing operations (POST, PUT, DELETE)
- Reject requests without valid CSRF tokens

**Frontend Integration Required:**

Your frontend must be updated to:

1. Read the CSRF token from the cookie
2. Include it in the `X-CSRF-TOKEN` header for non-GET requests

Example frontend code (React):

```typescript
// Get CSRF token from cookie
function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrf_access_token=([^;]+)/);
  return match ? match[1] : null;
}

// Include in API requests
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': getCsrfToken() || ''
  },
  credentials: 'include',
  body: JSON.stringify(data)
});
```

---

## 📋 Pre-Deployment Checklist

Complete these steps **before** deploying to any cloud provider:

- [ ] Verify Docker builds successfully locally
- [ ] Test application with PostgreSQL database locally
- [ ] Generate strong secret keys (see below)
- [ ] Choose cloud provider (AWS, Azure, or GCP)
- [ ] Create cloud account and set up billing
- [ ] Install cloud provider CLI tools
- [ ] Configure DNS for your domain (if using custom domain)
- [ ] Obtain SSL/TLS certificates (or use cloud provider's managed certificates)

---

## 🔐 Step 1: Generate Secret Keys

**Before deploying, generate cryptographically secure secret keys:**

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

**Save these keys securely** - you'll need them for the deployment steps below.

Example output:
```
SECRET_KEY=xK9mP2nQ7rT4wV8yZ1bC5fH6jL3nM9pR2sU4vX7zA0bD3eF5gH8
JWT_SECRET_KEY=aB2cD4eF6gH8iJ0kL1mN3oP5qR7sT9uV1wX3yZ5aB7cD9eF1gH3
```

---

## ☁️ Step 2: Choose Your Cloud Provider

Select one of the following deployment guides based on your cloud provider:

- **AWS Deployment**: See [AWS ECS](https://docs.aws.amazon.com/ecs/), [AWS Fargate](https://docs.aws.amazon.com/fargate/), or [AWS Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/) documentation for multi-container deployments
- [Azure Deployment](#azure-deployment-container-apps)
- [Google Cloud Deployment](#google-cloud-deployment-cloud-run)

**Note**: AWS App Runner is NOT recommended as it only supports single-container deployments. This application requires separate containers for backend, frontend, and database.

---

## 🧪 Step 3: Verify Deployment

After deploying to any cloud provider, verify the deployment:

### Test Health Endpoint
```bash
curl https://your-backend-url/hello
# Expected: {"message": "Hello, World!"}
```

### Test Database Connection
```bash
# Try to register a user
curl -X POST https://your-backend-url/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
# Expected: User created successfully
```

### Test Authentication
```bash
# Login
curl -X POST https://your-backend-url/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
# Expected: {"role": "student", "user_id": 1, "name": "Test User"}

# Access protected endpoint
curl https://your-backend-url/user/profile \
  -b cookies.txt
# Expected: User profile data
```

---

## 🎨 Step 4: Deploy Frontend

After the backend is deployed, update the frontend:

1. **Update frontend API URL**:
   ```typescript
   // frontend/src/util/api.ts
   const BASE_URL = 'https://your-backend-url';  // Your actual backend URL depends on provider
   ```

2. **Build frontend Docker image** (follow separate frontend Dockerfile guide)

3. **Deploy frontend** to the same cloud provider

4. **Update CORS_ORIGINS** on backend to include frontend URL:
   ```bash
   # AWS (consult your specific service documentation for updating environment variables)
   # For ECS: Update task definition
   # For Elastic Beanstalk: Use eb setenv command
   
   # Azure Container Apps
   az containerapp update --name peer-eval-api --resource-group peer-eval-rg \
     --set-env-vars CORS_ORIGINS=https://your-frontend-url
   
   # Google Cloud Run
   gcloud run services update peer-eval-api --region us-central1 \
     --update-env-vars CORS_ORIGINS=https://your-frontend-url
   ```

---

## 🔒 Step 5: Configure Custom Domain and SSL

### AWS
```bash
# Use AWS Certificate Manager
aws acm request-certificate --domain-name yourdomain.com --validation-method DNS
# Follow DNS validation instructions
# Configure custom domain in your AWS service (ECS, ALB, CloudFront, etc.)
# Consult specific service documentation for domain mapping
```

### Azure
```bash
# Add custom domain to Container App
az containerapp hostname add \
  --resource-group peer-eval-rg \
  --name peer-eval-api \
  --hostname yourdomain.com

# Azure automatically provisions managed certificate
```

### Google Cloud
```bash
# Map custom domain
gcloud run domain-mappings create --service peer-eval-api --domain yourdomain.com --region us-central1
# Follow DNS configuration instructions
```

---

## 📊 Step 6: Set Up Monitoring and Logging

### AWS CloudWatch
```bash
# Logs are automatically sent to CloudWatch
# View logs based on your deployment service:
aws logs tail /aws/ecs/containerinsights/your-cluster/performance --follow  # ECS
aws logs tail /aws/elasticbeanstalk/your-app/var/log/eb-engine.log --follow  # Elastic Beanstalk
# Consult your specific AWS service documentation for log group names
```

### Azure Monitor
```bash
# View logs
az containerapp logs show \
  --name peer-eval-api \
  --resource-group peer-eval-rg \
  --follow
```

### Google Cloud Logging
```bash
# View logs
gcloud run logs read peer-eval-api --region us-central1 --limit 50
```

---

## Example Production Configuration

**Local `.env` file for reference** (NEVER commit this file!):
```bash
FLASK_ENV=production
SECRET_KEY=xK9mP2nQ7rT4wV8yZ1bC5fH6jL3nM9pR2sU4vX7zA0bD3eF5gH8
JWT_SECRET_KEY=aB2cD4eF6gH8iJ0kL1mN3oP5qR7sT9uV1wX3yZ5aB7cD9eF1gH3
DATABASE_URL=postgresql://peeradmin:password@db.example.com:5432/peereval
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
JWT_COOKIE_DOMAIN=.yourdomain.com
```

---

## 📝 Post-Deployment Checklist

After deployment, verify all security measures are in place:

- [ ] `FLASK_ENV=production` is set
- [ ] Strong `SECRET_KEY` generated and stored in secret manager (32+ chars)
- [ ] Strong `JWT_SECRET_KEY` generated and stored in secret manager (different from SECRET_KEY)
- [ ] Production PostgreSQL database configured with `DATABASE_URL`
- [ ] HTTPS enabled with valid SSL certificates
- [ ] Frontend updated to handle CSRF tokens (if CSRF protection enabled)
- [ ] JWT authentication tested in production environment
- [ ] `CORS_ORIGINS` configured with actual frontend domain(s)
- [ ] Monitoring and logging configured
- [ ] Database backup strategy implemented
- [ ] Secrets never committed to git (check `.env` in `.gitignore`)
- [ ] All default passwords changed
- [ ] Database has firewall rules restricting access
- [ ] Container runs as non-root user (verify in Dockerfile)
- [ ] Rate limiting configured (consider adding Flask-Limiter)

---

## ⚙️ CORS Configuration

The Flask backend automatically reads `CORS_ORIGINS` from environment variables:

```bash
# Set during deployment
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

This configures the backend to accept requests from your frontend domain(s). The app automatically:
- Supports credentials (HTTPOnly cookies)
- Allows required headers: `Content-Type`, `X-CSRF-TOKEN`
- Allows methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

**No code changes needed** - just set the environment variable during deployment.

---

## 🔒 Security Best Practices

1. **Never commit secrets**: Always use cloud secret managers, never hardcode
2. **Rotate keys regularly**: Schedule quarterly rotation of `SECRET_KEY` and `JWT_SECRET_KEY`
3. **Use strong passwords**: Enforce password complexity (8+ chars, upper/lower/number/symbol)
4. **Monitor authentication failures**: Set up CloudWatch/Azure Monitor/GCP Logging alerts
5. **Keep dependencies updated**: Run `pip list --outdated` monthly and update packages
6. **Enable database encryption**: All cloud databases use encryption at rest by default
7. **Implement rate limiting**: Add Flask-Limiter to prevent brute force attacks
8. **Regular security audits**: Review logs weekly, conduct penetration testing quarterly
9. **Principle of least privilege**: Database users should have minimal necessary permissions
10. **Backup regularly**: Enable automated daily database backups on your cloud provider

---

## 🐛 Troubleshooting

### Issue: Container Won't Start

**Symptoms**: Container exits immediately, status shows "Failed"

**Solutions**:
1. Check logs for missing environment variables:
   ```bash
   # AWS (depends on your deployment service)
   aws ecs describe-tasks --cluster your-cluster --tasks your-task  # ECS
   aws logs tail /aws/ecs/your-service --follow  # View logs
   
   # Azure
   az containerapp logs show --name peer-eval-api --resource-group peer-eval-rg
   
   # GCP
   gcloud run logs read peer-eval-api --region us-central1 --limit 20
   ```

2. Verify all required secrets are set:
   - `SECRET_KEY`
   - `JWT_SECRET_KEY`
   - `DATABASE_URL`

3. Test Docker image locally:
   ```bash
   docker run -p 5000:5000 \
     -e FLASK_ENV=production \
     -e SECRET_KEY=test \
     -e JWT_SECRET_KEY=test \
     -e DATABASE_URL=postgresql://... \
     your-image:latest
   ```

### Issue: Database Connection Failing

**Symptoms**: App logs show "could not connect to server" or timeout errors

**Solutions**:
1. **Check firewall rules**: Ensure container can reach database
   - AWS: Check RDS security group allows inbound from ECS task security group or VPC
   - Azure: Check PostgreSQL firewall rules allow Container App subnet
   - GCP: Verify Cloud SQL connection is configured in Cloud Run

2. **Verify connection string format**:
   ```bash
   # Standard format
   postgresql://username:password@hostname:5432/database
   
   # With SSL (Azure requires this)
   postgresql://username:password@hostname:5432/database?sslmode=require
   
   # Cloud SQL (GCP format)
   postgresql://username:password@/database?host=/cloudsql/PROJECT:REGION:INSTANCE
   ```

3. **Test connection manually**:
   ```bash
   # Install psql client
   psql "postgresql://username:password@hostname:5432/database"
   ```

### Issue: Cookie Not Being Set

**Symptoms**: Frontend can't maintain logged-in state, authentication fails

**Solutions**:
1. **Verify HTTPS is enabled** - HTTPOnly secure cookies require HTTPS
2. **Check `JWT_COOKIE_DOMAIN`**:
   - Should match your domain (e.g., `.yourdomain.com` for subdomains)
   - Can be omitted for same-domain deployments
3. **Verify CORS configuration**:
   - Frontend must send `credentials: 'include'`
   - Backend `CORS_ORIGINS` must include exact frontend URL
4. **Check browser console** for CORS or cookie errors

### Issue: CSRF Token Validation Failing

**Symptoms**: POST/PUT/DELETE requests return 401 Unauthorized in production

**Solutions**:
1. Verify `JWT_COOKIE_CSRF_PROTECT` is `True` (automatic in production mode)
2. Update frontend to send CSRF token:
   ```typescript
   // Read from cookie
   const csrfToken = document.cookie.match(/csrf_access_token=([^;]+)/)?.[1];
   
   // Send in header
   headers: { 'X-CSRF-TOKEN': csrfToken || '' }
   ```
3. Check `X-CSRF-TOKEN` is in CORS allowed headers (already configured)

### Issue: Authentication Works but Then Fails

**Symptoms**: Login succeeds, but subsequent requests fail after a few minutes

**Solutions**:
1. **Token expiration** - Default JWT tokens expire after 15 minutes
   - Add token refresh logic to frontend
   - Or increase expiration in Flask: `JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)`

2. **Database connection pool exhausted**:
   ```bash
   # Add to environment variables
   SQLALCHEMY_POOL_SIZE=10
   SQLALCHEMY_POOL_RECYCLE=3600
   ```

### Issue: Secrets Not Being Loaded

**Symptoms**: App starts but uses default 'dev' secrets, security risk

**Solutions**:
1. **Verify secret manager permissions**:
   - AWS: IAM role must have `secretsmanager:GetSecretValue`
   - Azure: Managed identity must have Key Vault "Get" permission
   - GCP: Service account needs `secretmanager.versions.access`

2. **Check secret ARN/URI format**:
   - AWS: `arn:aws:secretsmanager:region:account:secret:name`
   - Azure: `keyvaultref:https://vault-name.vault.azure.net/secrets/SECRET-NAME`
   - GCP: `secret-name:latest`

3. **Restart service after updating secrets**

### Issue: High Memory Usage or Container Crashes

**Symptoms**: Container restarts frequently, out of memory errors

**Solutions**:
1. **Increase container memory**:

2. **Optimize Gunicorn workers**:
   ```bash
   # Rule of thumb: (2 x CPU cores) + 1
   gunicorn --workers 3 --threads 2 --bind 0.0.0.0:5000
   ```

3. **Check for memory leaks**: Monitor over time, investigate if memory grows continuously

---

## 📚 Additional Resources

### Documentation
- [Flask-JWT-Extended Documentation](https://flask-jwt-extended.readthedocs.io/)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Flask Security Best Practices](https://flask.palletsprojects.com/en/latest/security/)

### Cloud Provider Guides
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/fargate/)
- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Azure Container Apps Documentation](https://learn.microsoft.com/en-us/azure/container-apps/)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)

### Project Files
- `docker-compose.yml` - Local testing with PostgreSQL
- `flask_backend/Dockerfile` - Production Docker image configuration
- `docs/schema/database-schema.md` - Database schema documentation

---

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. **Check application logs** first - most issues show clear error messages
2. **Review this document's troubleshooting section**
3. **Consult cloud provider documentation** for platform-specific issues
4. **Check Flask/SQLAlchemy/JWT documentation** for application-level issues
5. **Contact the development team** with:
   - Exact error message from logs
   - Steps to reproduce the issue
   - Environment details (cloud provider, region, configuration)

---

## 📝 Maintenance Tasks

### Weekly
- [ ] Review application logs for errors
- [ ] Check database disk usage
- [ ] Verify backup jobs completed successfully

### Monthly
- [ ] Update Python dependencies (`pip list --outdated`)
- [ ] Review security alerts from cloud provider
- [ ] Check cost usage reports
- [ ] Test disaster recovery procedure

### Quarterly
- [ ] Rotate `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] Review and update database firewall rules
- [ ] Conduct security audit
- [ ] Review and optimize database indexes
- [ ] Load test application

---

**Document Version**: 2.0  
**Last Updated**: November 21, 2025  
**Maintainer**: COSC470 Development Team
