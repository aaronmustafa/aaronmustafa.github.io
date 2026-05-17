# EKS: Enabling Cross-Account Access to Secrets Stored in AWS Secrets Manager

![Author Nashwan](https://img.shields.io/badge/Author-Nashwan%20Mustafa-7a2840.svg?style=flat-square)

This guide explains how to enable **cross-account access** to AWS Secrets Manager secrets from an Amazon EKS cluster using **IAM Roles for Service Accounts (IRSA)**.

---

## 🛠 Step-by-Step Guide

### **Step 1: Create an IAM Role in the Target Account (Secrets Manager Account)**

1. **Create an IAM Role**  
   In the account where the secrets are stored, create an IAM role that allows the EKS cluster to assume it:

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

2. **Attach a Policy to Access Secrets Manager**
   Grant the role permissions to read the required secrets:

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
         "Resource": "arn:aws:secretsmanager:<region>:<account_id>:secret:<secret_name>"
       }
     ]
   }
   ```

---

### **Step 2: Enable IAM Roles for Service Accounts (IRSA) in EKS**

1. **Create an OIDC Identity Provider**

   ```sh
   aws eks describe-cluster --name <cluster_name> \
     --query "cluster.identity.oidc.issuer" --output text
   ```

   Use the OIDC issuer URL to create the provider:

   ```sh
   aws iam create-open-id-connect-provider \
     --url https://oidc.eks.<region>.amazonaws.com/id/<eks_cluster_id> \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list <thumbprint>
   ```

2. **Create an IAM Role for the Service Account**
   Define a trust policy for the OIDC provider:

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

   Create the role and attach the required policy:

   ```sh
   aws iam create-role \
     --role-name <role_name> \
     --assume-role-policy-document file://trust-policy.json

   aws iam attach-role-policy \
     --role-name <role_name> \
     --policy-arn arn:aws:iam::aws:policy/AmazonSecretsManagerReadOnly
   ```

3. **Associate IAM Role with Kubernetes Service Account**

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: <service_account_name>
     namespace: <namespace>
     annotations:
       eks.amazonaws.com/role-arn: arn:aws:iam::<account_id>:role/<role_name>
   ```

   Apply it:

   ```sh
   kubectl apply -f service-account.yaml
   ```

---

### **Step 3: Configure Pods to Use the IAM Role**

1. **Deploy Pods Using the Service Account**

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

2. **Verify IAM Role Assumption**

   ```sh
   kubectl logs <pod_name>
   ```

   Check that the pod can retrieve the secret.

---

## 📚 References

* [Authenticate to another account with IRSA - Amazon EKS](https://docs.aws.amazon.com/eks/latest/userguide/cross-account-access.html)
* [Consume AWS Secrets Manager Secrets From EKS Workloads](https://community.aws/content/2eKLFwELDylv0Sfuj3JLd6Out9W/navigating-amazon-eks-eks-integrate-secrets-manager)
* [Enabling Cross-Account Access to EKS Cluster Resources](https://aws.amazon.com/blogs/containers/enabling-cross-account-access-to-amazon-eks-cluster-resources/)
* [Provide Access to Other IAM Users and Roles After Cluster Creation](https://repost.aws/knowledge-center/amazon-eks-cluster-access)
* [Xebia: Accessing AWS Secrets Manager in EKS](https://xebia.com/blog/how-to-access-your-aws-secret-manager-secrets-in-an-elastic-kubernetes-service-cluster/)

