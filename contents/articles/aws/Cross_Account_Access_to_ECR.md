# EKS Cross-Account Access to ECR

![Author Nashwan](https://img.shields.io/badge/Author-Nashwan%20Mustafa-7a2840.svg?style=flat-square)

To enable an **Amazon EKS** cluster to access an **Amazon ECR** repository across multiple AWS accounts in a multi-tenant environment, follow these steps:

---

## 1. Create IAM Roles

- In the **target account** (where the ECR repository is located), create an IAM role that grants permissions to access the repository.  
- In the **EKS account**, create an IAM role that can assume the role in the target account.  

---

## 2. Update Trust Relationships

Update the trust relationship of the IAM role in the target account to allow the IAM role from the EKS account to assume it.  

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<EKS_ACCOUNT_ID>:role/<EKS_ROLE_NAME>"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
````

---

## 3. Configure ECR Repository Policy

In the target account, update the ECR repository policy to allow access from the IAM role in the EKS account.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<EKS_ACCOUNT_ID>:role/<EKS_ROLE_NAME>"
      },
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ]
    }
  ]
}
```

---

## 4. Enable IAM Roles for Service Accounts (IRSA)

### Step 1: Create an OIDC Identity Provider for Your EKS Cluster

* Get the OIDC issuer URL for your EKS cluster:

```sh
aws eks describe-cluster --name <cluster_name> --query "cluster.identity.oidc.issuer" --output text
```

* Use the URL to create the OIDC identity provider:

```sh
aws iam create-open-id-connect-provider \
    --url https://oidc.eks.<region>.amazonaws.com/id/<eks_cluster_id> \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list <thumbprint>
```

---

### Step 2: Create an IAM Role for the Service Account

* Create an IAM role with a trust policy that allows the EKS OIDC provider to assume the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account_id>:oidc-provider/oidc.eks.<region>.amazonaws.com/id/<eks_cluster_id>"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.<region>.amazonaws.com/id/<eks_cluster_id>:sub": "system:serviceaccount:<namespace>:<service_account_name>"
        }
      }
    }
  ]
}
```

* Attach the necessary policies:

```sh
aws iam create-role --role-name <role_name> --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name <role_name> --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
```

---

### Step 3: Associate the IAM Role with a Kubernetes Service Account

Create a Kubernetes service account and annotate it with the IAM role ARN:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: <service_account_name>
  namespace: <namespace>
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account_id>:role/<role_name>
```

Apply the configuration:

```sh
kubectl apply -f service-account.yaml
```

---

## 5. Configure Pods to Assume the IAM Role

### Step 1: Deploy Pods Using the Service Account

Ensure your pod specification uses the service account created earlier:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <deployment_name>
  namespace: <namespace>
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <app_label>
  template:
    metadata:
      labels:
        app: <app_label>
    spec:
      serviceAccountName: <service_account_name>
      containers:
      - name: <container_name>
        image: <image_uri>
        ports:
        - containerPort: 80
```

Apply the deployment:

```sh
kubectl apply -f deployment.yaml
```

---

### Step 2: Verify Role Assumption

Check the pod logs to ensure it has permissions to access the ECR repository:

```sh
kubectl logs <pod_name>
```

---

## References

1. [Enabling cross-account access to Amazon EKS cluster resources](https://aws.amazon.com/blogs/containers/enabling-cross-account-access-to-amazon-eks-cluster-resources/)
2. [Sharing Amazon ECR repositories with multiple accounts](https://aws.amazon.com/blogs/containers/sharing-amazon-ecr-repositories-with-multiple-accounts-using-aws-organizations/)
3. [ECR Cross Account Access | Security Best Practice - Intelligent Discovery](https://intelligentdiscovery.io/controls/ecr/ecr-cross-account-access)
4. [Adding cross-account access to EKS - DEV Community](https://dev.to/hayderimran7/adding-cross-account-access-to-eks-5ebh)
5. [AWS Docs – Amazon ECR Cross Account Access](https://docs.aws.amazon.com/AmazonECR/latest/userguide/RepositoryPolicyExamples.html)
