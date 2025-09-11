# Monkeys Identity & Access Management (IAM) System

A world-class, industry-level Identity and Access Management system built in Golang, designed to provide enterprise-grade security, scalability, and flexibility for modern applications.

## 🎯 Overview

This IAM system implements a comprehensive authorization and authentication framework that supports multi-tenant organizations, fine-grained access control, and policy-based security management. The design follows industry best practices from AWS IAM, Google Cloud IAM, and Azure Active Directory.

## 🏗️ System Architecture

### Core Principles
- **Zero Trust Security Model**: Never trust, always verify
- **Principle of Least Privilege**: Grant minimum necessary permissions
- **Defense in Depth**: Multiple layers of security controls
- **Scalable Multi-Tenancy**: Support for isolated organizational environments
- **Policy-Based Access Control**: Declarative security policies
- **Audit-First Design**: Complete traceability of all access decisions

## 📋 Core Entities

### 1. **Organizations**
Hierarchical top-level entities that provide tenant isolation and administrative boundaries.

```yaml
Organization:
  - id: unique identifier
  - name: human-readable name
  - parent_id: for nested organizations (optional)
  - metadata: extensible attributes
  - settings: organization-level configurations
  - created_at/updated_at: timestamps
  - status: active/suspended/deleted
```

**Features:**
- Nested organization support (org units, departments, projects)
- Inherited policies from parent organizations
- Cross-organization resource sharing with explicit grants
- Organization-level settings and compliance controls

### 2. **Principals** (Identity Entities)

#### **Users**
Human identities within the system.

```yaml
User:
  - id: unique identifier
  - username: unique within organization
  - email: primary identifier
  - display_name: human-readable name
  - organization_id: owning organization
  - groups: list of group memberships
  - attributes: extensible user properties
  - mfa_enabled: multi-factor authentication status
  - last_login: timestamp
  - status: active/suspended/deleted
```

#### **Service Accounts**
Machine identities for applications and services.

```yaml
ServiceAccount:
  - id: unique identifier
  - name: service account name
  - description: purpose description
  - organization_id: owning organization
  - key_rotation_policy: automatic key rotation settings
  - allowed_ip_ranges: network restrictions
  - max_token_lifetime: maximum session duration
  - status: active/suspended/deleted
```

#### **Groups**
Collections of users for simplified permission management.

```yaml
Group:
  - id: unique identifier
  - name: group name
  - description: purpose description
  - organization_id: owning organization
  - parent_group_id: for nested groups (optional)
  - members: list of user/service account IDs
  - attributes: extensible group properties
  - status: active/suspended/deleted
```

### 3. **Resources**
Unified entity representing any object or service that can be accessed.

```yaml
Resource:
  - id: unique identifier
  - arn: hierarchical resource name (e.g., arn:monkey:service:region:account:resource-type/resource-id)
  - type: resource category (object, service, namespace, etc.)
  - organization_id: owning organization
  - parent_resource_id: for hierarchical resources
  - attributes: resource metadata and tags
  - encryption_key_id: encryption configuration
  - lifecycle_policy: retention and archival rules
  - status: active/archived/deleted
```

**Resource Types:**
- **Objects**: Files, documents, media, content
- **Services**: APIs, applications, databases
- **Namespaces**: Logical groupings, projects, environments
- **Infrastructure**: Compute, storage, network resources

### 4. **Policies**
Declarative statements defining permissions and access rules.

```yaml
Policy:
  - id: unique identifier
  - name: policy name
  - description: policy purpose
  - version: policy version for updates
  - effect: Allow/Deny
  - principals: who the policy applies to
  - actions: permitted/denied operations
  - resources: target resources (supports wildcards)
  - conditions: contextual access requirements
  - created_by: policy author
  - organization_id: owning organization
```

**Policy Structure Example:**
```json
{
  "Version": "2024-01-01",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "user:john.doe@company.com",
      "Action": [
        "read:content",
        "write:metadata"
      ],
      "Resource": "arn:monkey:storage:us-east-1:org123:bucket/documents/*",
      "Condition": {
        "TimeOfDay": "09:00-17:00",
        "IPRange": "10.0.0.0/8",
        "MFARequired": true,
        "ResourceTags": {
          "Environment": "production",
          "Sensitivity": "internal"
        }
      }
    }
  ]
}
```

### 5. **Roles**
Named collections of policies that can be assumed by principals.

```yaml
Role:
  - id: unique identifier
  - name: role name
  - description: role purpose
  - organization_id: owning organization
  - policies: attached policy IDs
  - trust_policy: who can assume this role
  - max_session_duration: session time limits
  - assume_role_policy: conditions for role assumption
  - tags: role metadata
```

### 6. **Sessions**
Temporary credentials and access tokens.

```yaml
Session:
  - id: session identifier
  - principal_id: user/service account
  - assumed_role_id: role being used (optional)
  - organization_id: session context
  - issued_at: token creation time
  - expires_at: token expiration
  - permissions: effective permissions for session
  - context: session metadata (IP, device, etc.)
  - mfa_verified: multi-factor authentication status
```

## 🔐 Access Control Models

### 1. **Role-Based Access Control (RBAC)**
- Users assigned to roles
- Roles contain policies
- Hierarchical role inheritance

### 2. **Attribute-Based Access Control (ABAC)**
- Context-aware access decisions
- Dynamic policy evaluation
- Rich condition support

### 3. **Policy-Based Access Control (PBAC)**
- Declarative policy language
- Centralized policy management
- Policy versioning and rollback

## 🎛️ Operations & Actions

### Standard Operations
```yaml
Basic:
  - create: Create new resources
  - read: View resource content/metadata
  - update: Modify existing resources
  - delete: Remove resources
  - list: Enumerate resources

Advanced:
  - assume: Assume roles or impersonate
  - delegate: Grant permissions to others
  - audit: View access logs and reports
  - admin: Full administrative control

Granular:
  - read:metadata: View resource properties only
  - read:content: Access resource data
  - write:metadata: Update resource properties
  - write:content: Modify resource data
  - share:public: Make resources publicly accessible
  - share:link: Generate shareable links
  - transfer:ownership: Change resource owner
```

## 📏 Conditions & Context

### Temporal Conditions
- **Time of day**: Business hours restrictions
- **Date ranges**: Temporary access grants
- **Expiration**: Automatic access revocation

### Environmental Conditions
- **IP address ranges**: Network-based restrictions
- **Geographic location**: Location-based access
- **Device type**: Mobile/desktop policies
- **Security level**: Device compliance requirements

### Resource Conditions
- **Tags**: Resource metadata matching
- **Encryption status**: Require encrypted resources
- **Lifecycle stage**: Development/staging/production
- **Sensitivity level**: Data classification requirements

### Principal Conditions
- **MFA status**: Require multi-factor authentication
- **Group membership**: Dynamic group-based access
- **Authentication method**: SSO/federated identity requirements
- **Session age**: Require recent authentication

## 🔄 Authentication & Federation

### Identity Providers
- **Internal**: Native username/password
- **SAML 2.0**: Enterprise SSO integration
- **OpenID Connect**: Modern OAuth2-based SSO
- **LDAP/Active Directory**: Legacy directory integration
- **Social Identity**: Google, Microsoft, GitHub

### Multi-Factor Authentication
- **TOTP**: Time-based one-time passwords
- **SMS/Email**: Code-based verification
- **Hardware tokens**: FIDO2/WebAuthn support
- **Biometric**: Fingerprint, face recognition

### Token Management
- **JWT tokens**: Self-contained access tokens
- **Refresh tokens**: Long-lived credential renewal
- **API keys**: Service-to-service authentication
- **Temporary credentials**: Short-lived STS tokens

## 📊 Audit & Compliance

### Audit Trail
```yaml
AuditEvent:
  - id: unique event identifier
  - timestamp: when the event occurred
  - principal_id: who performed the action
  - action: what was attempted
  - resource_id: what was accessed
  - result: success/failure
  - ip_address: source network location
  - user_agent: client information
  - session_id: associated session
  - organization_id: tenant context
  - additional_context: action-specific details
```

### Compliance Features
- **Access reviews**: Periodic permission audits
- **Policy analysis**: Unused/overprivileged access detection
- **Data retention**: Configurable audit log retention
- **Compliance reporting**: SOX, GDPR, HIPAA support
- **Change management**: Policy change approval workflows

## 🏛️ System Architecture

### Microservices Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Authentication │    │   Authorization │    │   Resource      │
│  Service        │    │   Service       │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Policy         │    │   Audit         │    │   Session       │
│  Service        │    │   Service       │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Language**: Go (Golang)
- **Database**: PostgreSQL with Redis caching
- **Message Queue**: Apache Kafka for audit events
- **API Gateway**: Envoy Proxy for request routing
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

### Security Considerations
- **Data encryption**: At-rest and in-transit encryption
- **Secret management**: HashiCorp Vault integration
- **Rate limiting**: DDoS protection and abuse prevention
- **Input validation**: Comprehensive request sanitization
- **Security headers**: CORS, CSP, HSTS implementation

## 🚀 Implementation Phases

### Phase 1: Core Foundation (MVP)
- Basic user/organization management
- Simple RBAC with roles and permissions
- REST API with JWT authentication
- PostgreSQL data layer
- Basic audit logging

### Phase 2: Advanced Authorization
- Policy-based access control
- Condition-based policies
- Service account support
- API key management
- Enhanced audit trails

### Phase 3: Federation & Enterprise
- SAML/OIDC integration
- Multi-factor authentication
- Advanced reporting
- Policy analytics
- Compliance frameworks

### Phase 4: Advanced Features
- Machine learning for anomaly detection
- Zero-trust networking integration
- Advanced policy simulation
- Cross-cloud federation
- Mobile SDK support

## 📈 Scalability & Performance

### Database Design
- **Horizontal sharding**: Organization-based partitioning
- **Read replicas**: Improved query performance
- **Caching strategy**: Redis for session and policy data
- **Connection pooling**: Efficient database resource usage

### API Design
- **RESTful endpoints**: Standard HTTP methods
- **GraphQL support**: Flexible query capabilities
- **Rate limiting**: Per-principal request limits
- **Pagination**: Large dataset handling
- **Bulk operations**: Efficient batch processing

### Monitoring & Observability
- **Health checks**: Service availability monitoring
- **Metrics collection**: Performance and usage analytics
- **Distributed tracing**: Request flow visibility
- **Alerting**: Proactive issue detection
- **SLA monitoring**: Service level agreement tracking

This comprehensive IAM system provides enterprise-grade security while maintaining flexibility and scalability for modern application architectures.

## 🚀 Quick Start

### Prerequisites

- Go 1.21+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose (optional)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/the-monkeys/monkeys-identity.git
   cd monkeys-identity
   ```

2. **Setup environment**
   ```bash
   make setup
   # Edit .env file with your configuration
   ```

3. **Install dependencies**
   ```bash
   make deps
   ```

4. **Setup database**
   ```bash
   # Create PostgreSQL database
   createdb monkeys_iam
   
   # Run schema
   psql monkeys_iam -f schema.sql
   ```

5. **Run the application**
   ```bash
   # Development mode (with live reload)
   make dev
   
   # Or standard run
   make run
   ```

### Docker Setup

1. **Using Docker Compose (Recommended)**
   ```bash
   # Start all services (PostgreSQL, Redis, App)
   docker-compose up -d
   
   # View logs
   docker-compose logs -f monkeys-iam
   
   # Stop services
   docker-compose down
   ```

2. **Using Docker only**
   ```bash
   # Build image
   make docker-build
   
   # Run container
   make docker-run
   ```

### Verification

The application will be available at:
- **API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **API Documentation**: [API.md](./API.md)

Optional management tools:
- **pgAdmin**: http://localhost:5050 (admin@monkeys.com / admin)
- **Redis Commander**: http://localhost:8081

## 📊 Project Structure

```
monkeys-identity/
├── cmd/
│   └── server/          # Application entry point
│       └── main.go
├── internal/
│   ├── config/          # Configuration management
│   ├── database/        # Database connection
│   ├── handlers/        # HTTP handlers
│   ├── middleware/      # HTTP middleware
│   ├── models/          # Data models
│   └── routes/          # Route definitions
├── pkg/
│   └── logger/          # Logging utilities
├── schema.sql           # Database schema
├── docker-compose.yml   # Docker services
├── Dockerfile           # Container definition
├── Makefile            # Build automation
├── API.md              # API documentation
└── README.md           # This file
```

## 🛠️ Development

### Available Commands

```bash
# Development
make dev              # Run with live reload
make build            # Build binary
make test             # Run tests
make test-coverage    # Run tests with coverage

# Code quality
make fmt              # Format code
make lint             # Run linter
make vet              # Run go vet

# Docker
make docker-build     # Build Docker image
make docker-compose-up   # Start with docker-compose

# Database
make db-setup         # Setup database schema
make db-reset         # Reset database

# Tools
make install-tools    # Install development tools
```

### API Examples

#### Authentication
```bash
# Register new user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "email": "john@example.com", 
    "password": "password123",
    "display_name": "John Doe",
    "organization_id": "org-uuid"
  }'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### User Management
```bash
# List users (requires authentication)
curl -X GET http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create user (admin only)
curl -X POST http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane.smith",
    "email": "jane@example.com",
    "display_name": "Jane Smith"
  }'
```

## 🏗️ Architecture

The system follows a clean architecture pattern with:

- **Fiber Framework**: High-performance HTTP router
- **PostgreSQL**: Primary database with JSONB support
- **Redis**: Caching and session storage
- **JWT**: Stateless authentication
- **Docker**: Containerized deployment
- **Clean Code**: Structured, maintainable codebase

### Key Features Implemented

✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (RBAC)
- Policy-based access control (PBAC)
- Multi-factor authentication support

✅ **User Management**
- User registration and profiles
- Service accounts for machines
- Group management and memberships

✅ **Resource Management**
- Hierarchical resource organization
- ARN-style resource naming
- Flexible permission assignment

✅ **Policy Engine**
- JSON-based policy documents
- Condition-based access control
- Policy simulation and testing

✅ **Audit & Compliance**
- Comprehensive audit logging
- Access reviews and reports
- Compliance framework support

✅ **Session Management**
- Device tracking
- Session lifecycle management
- Token refresh mechanisms

✅ **API Design**
- RESTful endpoints
- Comprehensive error handling
- Rate limiting and security headers

## 🔒 Security Features

- **Zero Trust Architecture**: Never trust, always verify
- **Encryption**: Data encryption at rest and in transit
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive request sanitization
- **Audit Trails**: Complete activity logging
- **Session Security**: Secure token management
- **CORS Protection**: Cross-origin request security

## 📈 Performance & Scalability

- **High Performance**: Fiber framework for speed
- **Caching**: Redis for session and policy caching
- **Database Optimization**: Proper indexing and queries
- **Horizontal Scaling**: Stateless design
- **Connection Pooling**: Efficient database connections

## 🧪 Testing

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run security scan
make security-scan
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions and support:
- Create an issue on GitHub
- Check the [API Documentation](./API.md)
- Review the [Database Documentation](./DATABASE_DOCUMENTATION.md)