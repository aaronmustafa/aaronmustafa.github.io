## 🔐 Cross-Account Secrets Management for Multi-Tenant EKS with Terraform & External Secrets Operator

As Kubernetes platform engineers, we often face the challenge of securely sharing secrets across AWS accounts.

Here’s the scenario:

Management Account (mgmt)
Stores all secrets in AWS Secrets Manager / SSM Parameter Store.

Tenant Accounts
Each tenant runs their own EKS cluster. As part of onboarding, we deploy External Secrets Operator (ESO) in the tenant cluster. ESO must pull secrets from the mgmt account and inject them into Kubernetes Secrets.

Constraints

Secure, least privilege IAM design

Scalable to 200+ tenants

Minimal operational overhead




---

✅ Recommended Solution (IRSA + Cross-Account AssumeRole)

We’ll use IAM Roles for Service Accounts (IRSA) to map Kubernetes service accounts → IAM roles in tenant accounts.
ESO in each tenant cluster will assume a role in the mgmt account that grants read-only access to secrets.

Flow at runtime:

1. ESO pod → authenticates with IRSA role in tenant account.


2. Tenant IRSA role → allowed to sts:AssumeRole into mgmt account role.


3. Mgmt role → has secretsmanager:GetSecretValue permission.


4. ESO fetches secret → creates Kubernetes Secret.




---

🛠 IAM & Terraform Design

We’ll define two Terraform modules:

1. Management Account Setup

Create a role mgmt-secrets-reader-role with read-only permissions and trust policy for tenant principals.

### Management Account
```hcl
resource "aws_iam_policy" "read_secrets" {
  name        = "mgmt-secrets-reader-policy"
  description = "Read-only access for ESO tenants"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:myapp/*"
    }]
  })
}

resource "aws_iam_role" "mgmt_secrets_reader" {
  name = "mgmt-secrets-reader-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = var.allowed_tenant_roles
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.mgmt_secrets_reader.name
  policy_arn = aws_iam_policy.read_secrets.arn
}

👉 Scaling tip: Instead of updating the trust for 200+ tenants, use AWS Organizations:

Condition = {
  StringEquals = {
    "aws:PrincipalOrgID" = "o-xxxxxxxxxx"
  }
}

```
---

2. Tenant Account Setup

In each tenant account, create an IRSA role bound to ESO’s ServiceAccount.
This role is only allowed to sts:AssumeRole into the mgmt role.

### Tenant Account
```hcl
resource "aws_iam_role" "tenant_irsa" {
  name = "tenant-eso-irsa-role"

  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role.json
}

resource "aws_iam_policy" "allow_assume" {
  name   = "allow-assume-mgmt-role"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sts:AssumeRole"]
      Resource = var.mgmt_role_arn
    }]
  })
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.tenant_irsa.name
  policy_arn = aws_iam_policy.allow_assume.arn
}
```

Bind the role to ESO’s ServiceAccount:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-operator
  namespace: external-secrets
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<tenant_id>:role/tenant-eso-irsa-role
```

---

🌐 External Secrets Operator Config

Point ESO to the mgmt role:
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: mgmt-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      role: arn:aws:iam::<mgmt_account_id>:role/mgmt-secrets-reader-role

Example secret mapping:

apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: mgmt-secrets
    kind: ClusterSecretStore
  target:
    name: db-secret
  data:
    - secretKey: username
      remoteRef:
        key: prod/db/username
    - secretKey: password
      remoteRef:
        key: prod/db/password

```
---

⚖️ Alternative Approach (Resource Policies)

Instead of AssumeRole, attach a Secrets Manager resource policy that allows tenant IRSA roles to fetch secrets.

✔ Simpler for small setups
✘ Painful at scale (200 tenants × many secrets)


---

🔑 Key Benefits of IRSA + AssumeRole

Security → least privilege, auditable cross-account access

Scalability → one mgmt role for all tenants (with Org trust)

Automation → new tenant onboarding only touches tenant account

Compatibility → aligns with ESO’s roleArn provider model



---

🚀 Operational Checklist

[x] Mgmt: create mgmt-secrets-reader-role

[x] Tenant: create IRSA role + allow sts:AssumeRole

[x] Deploy ESO with annotated ServiceAccount

[x] Add ClusterSecretStore referencing mgmt role ARN

[x] Map secrets via ExternalSecret CRDs

[x] Audit via CloudTrail (STS + SecretsManager events)



---

📌 Conclusion

By combining Terraform, IRSA, and ESO, we can build a secure, scalable, multi-tenant secrets management architecture:

One central mgmt account holding all secrets

Tenant clusters pulling them via ESO

Minimal ops overhead, even with 200+ tenants



---

