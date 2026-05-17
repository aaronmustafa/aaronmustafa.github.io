
# Cost-Optimization with Shared VPC Endpoints in a Multi-Account TGW Setup

![Author Nashwan](https://img.shields.io/badge/Author-Nashwan%20Mustafa-7a2840.svg?style=flat-square)

---

## 📌 Overview

The cost of **VPC Endpoints** can escalate quickly in multi-account AWS environments. While **Interface Endpoints** provide a scalable way to connect to AWS services, deploying them per-VPC across multiple Availability Zones (AZs) becomes cost-prohibitive.  

For example:
- Each Interface Endpoint costs **$0.01 per AZ per hour**.
- Deploying 50 endpoints across 3 AZs in 20 VPCs:  
```

0.01 × 50 × 3 × 20 = \$30/hr (\~\$20,000/month)

```
- Even a smaller deployment of 10 endpoints in 3 AZs costs:
```

10 × 3 × 24 × 30 × 0.01 = \~\$216/month

````

At scale (e.g., 100 accounts, each with 10 endpoints), the cost reaches **$21,600/month (~$259k/year)** — clearly unsustainable.

---

## 💡 The Shared VPC Endpoint Model

By centralizing VPC endpoints into a **Shared Services VPC** and connecting accounts using **AWS Transit Gateway (TGW)**, organizations can drastically reduce costs, simplify management, and optimize operations.

---

## 🔑 How This Achieves Cost Savings

1. **Elimination of Redundant Endpoints**
 - Decentralized: 1,000 accounts × 10 endpoints × 3 AZs = **$270,000/month**.  
 - Centralized: 10 endpoints × 3 AZs = **$270/month**.  
 - **Savings: ~99.9%**

2. **Reduced Data Transfer Costs**
 - VPC Endpoints keep traffic on the AWS backbone, avoiding **NAT Gateway/Internet Gateway** charges (~$0.045/GB).
 - **Gateway Endpoints** (S3, DynamoDB) are free.

3. **Centralized Management**
 - Endpoint configuration, updates, and policies are handled only in the **Shared Services Account**.

4. **Transit Gateway Efficiency**
 - Single TGW simplifies connectivity compared to managing many **VPC peering** connections.

5. **Route 53 Private Hosted Zone (PHZ) Cost**
 - VPC IDs of spoke accounts are associated with PHZ (~$0.50/month) , instead of one per account.

---

## 📊 Cost Savings Analysis

| **Aspect**               | **Decentralized Model (Per Account)** | **Shared Model (Centralized)** | **Savings**                     |
|--------------------------|---------------------------------------|--------------------------------|---------------------------------|
| Number of Accounts       | 1,000                                | 1 (Shared Services Account)    | -                               |
| Endpoints per Account    | 10                                   | 10 (centralized)               | -                               |
| Cost per Endpoint (3 AZs)| ~$27/month                           | ~$27/month                     | -                               |
| Total Endpoint Cost      | $270,000/month                       | $270/month                     | ~$269,730/month (99.9% reduction) |
| Data Transfer Costs      | NAT/Internet charges possible         | None (AWS backbone)            | Significant savings             |
| Management Overhead      | High (1,000 accounts)                | Low (centralized)              | Reduced admin effort            |

**Example:**  
- **Decentralized**: $270,000/month  
- **Centralized**: ~$370.50/month (Endpoints + TGW + PHZ)  
- **Savings**: ~$269,629.50/month (99.86% reduction)

---

## 🏗️ Solution Implementation

### Resources Created
From the **Shared VPC account** (assuming VPCs & TGW already exist):

1. Create Interface VPC Endpoints in Shared Services VPC - core network account.  
2. Disable **Private DNS** when creating endpoints.  
3. Create a **Private Hosted Zone (PHZ)** matching the endpoint name (e.g., `ec2.amazonaws.com`) for DNS control.  

Next:
1. Associate the spoke accounts' VPC IDs with vpc endpoint PHZ created in the core network account where vpc-endpoints are created.  
2. Ensure proper subnet routing & security groups.  

---

## 🔗 Integrating TGW, PrivateLink & Route 53

This solution follows AWS best practices by combining:
- **Transit Gateway**
- **Amazon Route 53 Hosted Zones**
- **Shared Service VPC Endpoints**

### Benefits
- Reduces endpoint sprawl.
- Simplifies deployment/operations.
- Enables cost optimization at scale.

### Architecture Notes
- For **PrivateLink services behind NLBs**, DNS is public → only L3 connectivity required (VPC Peering, TGW, VPN).  
- For **AWS services or SaaS endpoints**, enable Private DNS → AWS creates a managed PHZ.  
- Managed PHZ works only within the same VPC. To share resolution across accounts/VPCs → use **custom PHZ + Route 53 Resolver**.

![Architecture](./contents/articles/images/vpc-endpoint.png)

🔗 [AWS Blog Reference](https://aws.amazon.com/blogs/networking-and-content-delivery/integrating-aws-transit-gateway-with-aws-privatelink-and-amazon-route-53-resolver/)

---

## ⚙️ Associating a Route 53 PHZ Across Accounts

Steps to associate a PHZ in **Account A** with a VPC in **Account B**:

1. Set AWS CLI profile to **Account A**.  
2. List hosted zones:
 ```bash
 aws route53 list-hosted-zones
````

3. Authorize association:

   ```bash
   aws route53 create-vpc-association-authorization \
     --hosted-zone-id <hosted-zone-id> \
     --vpc VPCRegion=<region>,VPCId=<vpc-id> \
     --region ap-southeast-2
   ```
4. Switch to **Account B** profile.
5. Associate VPC with hosted zone:

   ```bash
   aws route53 associate-vpc-with-hosted-zone \
     --hosted-zone-id <hosted-zone-id> \
     --vpc VPCRegion=<region>,VPCId=<vpc-id> \
     --region ap-southeast-2
   ```
6. (Optional best practice) Delete authorization:

   ```bash
   aws route53 delete-vpc-association-authorization \
     --hosted-zone-id <hosted-zone-id> \
     --vpc VPCRegion=<region>,VPCId=<vpc-id> \
     --region us-east-1
   ```

---

## 📚 References

* [Centralized VPC Endpoint Model for Cost Savings](https://allcloud.io/go/reduce-costs-and-boost-security-with-centralized-vpc-shared-endpoints-model/)
* [Shared VPC Endpoints with TGW](https://medium.com/@KiranNalla3/aws-cost-savings-by-using-shared-vpc-interface-endpoints-in-a-multi-account-tgw-setup-f58b8ed90c72)
* [Building Scalable Multi-VPC Networks](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/centralized-access-to-vpc-private-endpoints.html)
* [VPC Endpoints vs NAT Gateway Cost Comparison](https://pcg.io/insights/vpc-endpoints-explanation-and-cost-comparison/)
* [Benefits of VPC Endpoints](https://aws.amazon.com/blogs/architecture/reduce-cost-and-increase-security-with-amazon-vpc-endpoints/)

---

✅ This architecture achieves **significant cost savings**, simplifies management, and maintains security for organizations with 1,000+ AWS accounts.

