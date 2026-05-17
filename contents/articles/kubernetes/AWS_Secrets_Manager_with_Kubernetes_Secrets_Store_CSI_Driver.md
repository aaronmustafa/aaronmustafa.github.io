# AWS Secrets Manager with Kubernetes Secrets Store CSI Driver

![Author Nashwan](https://img.shields.io/badge/Author-Nashwan%20Mustafa-7a2840.svg?style=flat-square)

## Overview
The **AWS Secrets and Configuration Provider (ASCP)** for the Kubernetes Secrets Store CSI Driver allows you to securely mount secrets stored in **AWS Secrets Manager** as files in your Amazon EKS pods.  
This integration ensures that secrets are encrypted at rest and in transit, and supports automatic rotation.

---

## Steps to Implement

### 1. Set Up Access Control
- **Create an IAM Policy**: Grant permissions to access the secrets. Example:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": ["arn:aws:secretsmanager:region:account-id:secret:MySecret-??????"]
    }
  ]
}
````

* **Create an IAM Role**: Associate this policy with an IAM role and link it to your EKS service account using the IAM OIDC provider.

---

### 2. Install the Secrets Store CSI Driver and ASCP

* **Install the CSI Driver**:

```sh
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm install -n kube-system csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver
```

* **Install the ASCP**:

```sh
helm repo add aws-secrets-manager https://aws.github.io/secrets-store-csi-driver-provider-aws
helm install -n kube-system secrets-provider-aws aws-secrets-manager/secrets-store-csi-driver-provider-aws
```

---

### 3. Create a SecretProviderClass

Define which secrets to mount and how they should appear in the pod. Example YAML:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-secrets
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "arn:aws:secretsmanager:region:account-id:secret:MySecret"
        objectType: "secretsmanager"
```

---

### 4. Deploy Your Application

Reference the SecretProviderClass in your deployment. Example YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-service-account
      containers:
      - name: my-app
        image: my-app-image
        volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets-store"
          readOnly: true
      volumes:
      - name: secrets-store
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: "aws-secrets"
```

---

## Key Features

* **Automatic Rotation**: If you enable automatic rotation in AWS Secrets Manager, the Secrets Store CSI Driver can automatically update the mounted secrets in your pods.
* **Fine-Grained Access Control**: Use IAM roles and policies to control which pods have access to specific secrets.
* **Failover Regions**: Specify a secondary AWS region to retrieve secrets in case of connectivity issues or disaster recovery scenarios.

---

## References

1. [AWS Secrets Manager with Kubernetes Secrets Store CSI Driver](https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating_csi_driver.html)
2. [GitHub - aws/secrets-store-csi-driver-provider-aws](https://github.com/aws/secrets-store-csi-driver-provider-aws)
3. [Accessing AWS Secret Manager in Kubernetes Service Cluster - Xebia](https://xebia.com/blog/how-to-access-your-aws-secret-manager-secrets-in-an-elastic-kubernetes-service-cluster/)
4. [Secrets Store - Amazon EKS Blueprints Quick Start](https://aws-quickstart.github.io/cdk-eks-blueprints/addons/secrets-store/)
5. [Secrets Store CSI Driver Docs](https://secrets-store-csi-driver.sigs.k8s.io/)

---

✅ This setup ensures that your secrets are managed securely and efficiently within your EKS environment.

