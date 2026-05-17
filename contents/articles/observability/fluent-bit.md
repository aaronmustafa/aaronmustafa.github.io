## Shipping Logs from Kubernetes to CloudWatch log groups with fluent-bit

![Author Nashwan](https://img.shields.io/badge/Author-Nashwan%20Mustafa-7a2840.svg?style=flat-square)

in this Article I will explain how to configure fluent-bit on EKS for shipping container logs to CloudWatch Log Group. 

Fluent Bit is a lightweight and efficient log processor and forwarder that can be used to ship logs from Amazon EKS (Elastic Kubernetes Service) to AWS CloudWatch Logs. Here’s a step-by-step guide on how to set it up, along with an example configuration.

### Step-by-Step Guide

1. **Prerequisites**:
   - An AWS account.
   - An EKS cluster.
   - IAM roles and policies configured for your EKS nodes to allow Fluent Bit to send logs to CloudWatch.

2. **Create IAM Policy and Role**:
   - Create an IAM policy that allows Fluent Bit to write to CloudWatch Logs.
   - Attach this policy to an IAM role that your EKS nodes will assume.

   Example IAM Policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "logs:CreateLogGroup",
           "logs:CreateLogStream",
           "logs:PutLogEvents",
           "logs:DescribeLogStreams"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

3. **Deploy Fluent Bit as a DaemonSet**:
   - Create a Kubernetes DaemonSet to deploy Fluent Bit on all nodes in your EKS cluster.

   Example `fluent-bit.yaml`:
   ```yaml
   apiVersion: apps/v1
   kind: DaemonSet
   metadata:
     name: fluent-bit
     namespace: kube-system
   spec:
     selector:
       matchLabels:
         k8s-app: fluent-bit
     template:
       metadata:
         labels:
           k8s-app: fluent-bit
       spec:
         serviceAccountName: fluent-bit
         containers:
           - name: fluent-bit
             image: amazon/aws-for-fluent-bit:latest
             resources:
               limits:
                 memory: 200Mi
               requests:
                 cpu: 100m
                 memory: 100Mi
             volumeMounts:
               - name: varlog
                 mountPath: /var/log
               - name: varlibdockercontainers
                 mountPath: /var/lib/docker/containers
                 readOnly: true
         volumes:
           - name: varlog
             hostPath:
               path: /var/log
           - name: varlibdockercontainers
             hostPath:
               path: /var/lib/docker/containers
   ```

4. **Configure Fluent Bit**:
   - Define the Fluent Bit configuration to specify how logs are collected and where they are sent.

   Example `fluent-bit-configmap.yaml`:
   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: fluent-bit-config
     namespace: kube-system
   data:
     fluent-bit.conf: |
       [SERVICE]
           Flush        1
           Log_Level    info
           Parsers_File parsers.conf

       [INPUT]
           Name        tail
           Path        /var/log/containers/*.log
           Parser      docker
           Tag         kube.*
           Refresh_Interval 5

       [FILTER]
           Name        kubernetes
           Match       kube.*
           Kube_URL    https://kubernetes.default.svc:443
           Kube_CA_File /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
           Kube_Token_File /var/run/secrets/kubernetes.io/serviceaccount/token
           Kube_Tag_Prefix kube.var.log.containers.
           Merge_Log    On
           Merge_Log_Key log_processed
           Keep_Log     Off

       [OUTPUT]
           Name        cloudwatch_logs
           Match       kube.*
           region      us-west-2
           log_group_name fluent-bit-cloudwatch
           log_stream_prefix from-fluent-bit-
           auto_create_group true
     parsers.conf: |
       [PARSER]
           Name   docker
           Format json
           Time_Key time
           Time_Format %Y-%m-%dT%H:%M:%S.%L
           Time_Keep On
           # Command      |  Decoder | Field | Optional Action
           # =============|==================|=================
           Decode_Field_As   escaped_utf8    log
   ```

5. **Apply the Configuration**:
   - Apply the DaemonSet and ConfigMap to your EKS cluster using `kubectl`.

   ```sh
   kubectl apply -f fluent-bit-configmap.yaml
   kubectl apply -f fluent-bit.yaml
   ```

### Example

Here’s a complete example of how to set up Fluent Bit to ship logs from EKS to CloudWatch Logs:

1. **Create IAM Policy and Role**:
   - Follow the steps to create an IAM policy and role as described above.

2. **Deploy Fluent Bit**:
   - Save the `fluent-bit.yaml` and `fluent-bit-configmap.yaml` files.
   - Apply them to your EKS cluster:
     ```sh
     kubectl apply -f fluent-bit-configmap.yaml
     kubectl apply -f fluent-bit.yaml
     ```

3. **Verify Logs in CloudWatch**:
   - Go to the CloudWatch Logs console in AWS.
   - Check for the log group `fluent-bit-cloudwatch` and verify that logs are being shipped from your EKS cluster.

This setup ensures that logs from your EKS cluster are efficiently shipped to AWS CloudWatch Logs using Fluent Bit¹²³. If you have any questions or need further assistance, feel free to ask!

Source:
(1) Set up Fluent Bit as a DaemonSet to send logs to CloudWatch Logs. https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-logs-FluentBit.html.
(2) Configure Fluent Bit for CloudWatch - EKS Anywhere. https://anywhere.eks.amazonaws.com/docs/clustermgmt/observability/fluentbit-logging/.
(3) AWS For Fluent Bit - Amazon EKS Blueprints Quick Start - GitHub Pages. https://aws-quickstart.github.io/cdk-eks-blueprints/addons/aws-for-fluent-bit/.
(4) Stream container logs to CloudWatch in Amazon EKS | AWS re:Post. https://repost.aws/knowledge-center/cloudwatch-stream-container-logs-eks.
(5) Amazon CloudWatch | Fluent Bit: Official Manual. https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch.
(6) undefined. https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/fluent-bit/fluent-bit.yaml.
(7) github.com. https://github.com/sellerlabs/docker2cloudwatchlogs/tree/d8b4dab93ba7b6a25335b717a336bd791be2fde7/README.md.
(8) github.com. https://github.com/shagamemnon/cloudflare-to-cloudwatch/tree/34ebdad440dabb1bb3e2a7f270e2e2e000933558/README.md.
(9) github.com. https://github.com/happy-nut/happy-nut.github.io/tree/0e68a5dbba37c4947b3db19d099b8f1f608e8efa/tils%2Fdev%2Fops%2Fkubernetes%2Fk8s-monitoring.md.
(10) github.com. https://github.com/YuanyaTianchi/yuanyatianchi.github.io/tree/2293e3ddc056e16b29b47b812859a68f01a93950/0%2Fit.cloudnative.Kubernetes.base.md.

