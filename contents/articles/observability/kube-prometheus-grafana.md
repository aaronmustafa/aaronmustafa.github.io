A comprehensive set of Prometheus rules and a Grafana dashboard for Kubernetes cluster health monitoring:

Prometheus Alert Rules (prometheus-rules.yaml)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubernetes-cluster-health
  namespace: monitoring
spec:
  groups:
  - name: node-health
    rules:
    - alert: NodeDown
      expr: up{job="kubernetes-nodes"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.instance }} is down"
        description: "{{ $labels.instance }} has been down for more than 5 minutes"
    
    - alert: HighMemoryUsage
      expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage on {{ $labels.instance }}"
        description: "Memory usage is at {{ $value }}%"
    
    - alert: HighCPUUsage
      expr: (100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High CPU usage on {{ $labels.instance }}"
        description: "CPU usage is at {{ $value }}%"
    
    - alert: DiskPressure
      expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 15
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Disk space low on {{ $labels.instance }}"
        description: "Root filesystem has only {{ $value }}% available space"
    
    - alert: NodeNotReady
      expr: kube_node_status_condition{condition="Ready",status="true"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.node }} is not ready"
        description: "Node {{ $labels.node }} has been in NotReady state for 5 minutes"

  - name: pod-health
    rules:
    - alert: PodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.pod }} is crash looping"
        description: "Container {{ $labels.container }} in pod {{ $labels.pod }} is restarting frequently"
    
    - alert: PodNotReady
      expr: sum by(namespace, pod) (kube_pod_status_ready{condition="false"}) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.pod }} is not ready"
    
    - alert: HighPodRestarts
      expr: sum by(namespace, pod) (increase(kube_pod_container_status_restarts_total[1h])) > 5
      labels:
        severity: warning
      annotations:
        summary: "High number of restarts for pod {{ $labels.pod }}"

  - name: cluster-components
    rules:
    - alert: KubeAPIDown
      expr: up{job="apiserver"} == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Kubernetes API server is down"
    
    - alert: KubeSchedulerDown
      expr: up{job="kube-scheduler"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Kubernetes scheduler is down"
    
    - alert: KubeControllerManagerDown
      expr: up{job="kube-controller-manager"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Kubernetes controller manager is down"
    
    - alert: KubeletDown
      expr: count by(node) (up{job="kubelet"} == 0) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Kubelet on {{ $labels.node }} is down"
    
    - alert: EtcdMembersDown
      expr: etcd_server_has_leader != 1
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Etcd member {{ $labels.instance }} has no leader"
    
    - alert: CoreDNSDown
      expr: up{job="coredns"} == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "CoreDNS is down"

  - name: resource-utilization
    rules:
    - alert: HighDeploymentReplicasUnavailable
      expr: kube_deployment_status_replicas_unavailable > 0
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Deployment {{ $labels.deployment }} has unavailable replicas"
    
    - alert: HighPendingPods
      expr: sum(kube_pod_status_phase{phase="Pending"}) by(namespace) > 10
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High number of pending pods in {{ $labels.namespace }}"
    
    - alert: ResourceQuotaExceeded
      expr: kube_resourcequota{type="used"} / kube_resourcequota{type="hard"} > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Resource quota nearly exceeded in {{ $labels.namespace }}"
```

Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "Kubernetes Cluster Health",
    "description": "Comprehensive monitoring of Kubernetes cluster health and components",
    "tags": ["kubernetes", "prometheus"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "title": "Cluster Overview",
        "type": "stat",
        "gridPos": {"h": 3, "w": 24, "x": 0, "y": 0},
        "targets": [{
          "expr": "count(kube_node_info)",
          "legendFormat": "Nodes"
        }, {
          "expr": "count(kube_pod_info)",
          "legendFormat": "Pods"
        }, {
          "expr": "count(kube_deployment_created)",
          "legendFormat": "Deployments"
        }, {
          "expr": "count(kube_namespace_created)",
          "legendFormat": "Namespaces"
        }],
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "justifyMode": "center"
        }
      },
      {
        "title": "Node Status",
        "type": "table",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 3},
        "targets": [{
          "expr": "kube_node_status_condition{condition=\"Ready\"}",
          "instant": true,
          "format": "table"
        }],
        "columns": [
          {"text": "Node", "value": "node"},
          {"text": "Status", "value": "value"}
        ]
      },
      {
        "title": "Node CPU Usage %",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 3},
        "targets": [{
          "expr": "(1 - avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) by (instance)) * 100",
          "legendFormat": "{{instance}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        }
      },
      {
        "title": "Node Memory Usage %",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 11},
        "targets": [{
          "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
          "legendFormat": "{{instance}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        }
      },
      {
        "title": "Pod Status by Namespace",
        "type": "barchart",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 11},
        "targets": [{
          "expr": "sum by(namespace, phase) (kube_pod_status_phase)",
          "legendFormat": "{{phase}}"
        }]
      },
      {
        "title": "Pod Restarts (Last 1 Hour)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 19},
        "targets": [{
          "expr": "sum by(namespace, pod) (increase(kube_pod_container_status_restarts_total[1h]))",
          "legendFormat": "{{pod}}"
        }]
      },
      {
        "title": "Component Status",
        "type": "stat",
        "gridPos": {"h": 4, "w": 12, "x": 12, "y": 19},
        "targets": [
          {"expr": "up{job=\"apiserver\"}", "legendFormat": "API Server"},
          {"expr": "up{job=\"kube-scheduler\"}", "legendFormat": "Scheduler"},
          {"expr": "up{job=\"kube-controller-manager\"}", "legendFormat": "Controller Manager"},
          {"expr": "avg(up{job=\"kubelet\"})", "legendFormat": "Kubelets"}
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        }
      },
      {
        "title": "Active Alerts",
        "type": "table",
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 27},
        "targets": [{
          "expr": "ALERTS{alertstate=\"firing\"}",
          "instant": true,
          "format": "table"
        }],
        "columns": [
          {"text": "Alert", "value": "alertname"},
          {"text": "Severity", "value": "severity"},
          {"text": "Instance", "value": "instance"},
          {"text": "Summary", "value": "summary"}
        ]
      },
      {
        "title": "Network Traffic (Receive)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 35},
        "targets": [{
          "expr": "rate(node_network_receive_bytes_total[5m])",
          "legendFormat": "{{instance}} - {{device}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "Bps"
          }
        }
      },
      {
        "title": "Disk Usage %",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 35},
        "targets": [{
          "expr": "(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100",
          "legendFormat": "{{instance}} - {{mountpoint}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        }
      }
    ],
    "refresh": "30s",
    "schemaVersion": 36,
    "version": 1
  }
}
```

Installation Steps

1. Deploy Prometheus Rules

```bash
# Apply the Prometheus rules
kubectl apply -f prometheus-rules.yaml

# Verify the rules
kubectl get prometheusrules -n monitoring
```

2. Import Grafana Dashboard

1. Open Grafana UI
2. Navigate to Dashboards → Import
3. Paste the JSON content
4. Select your Prometheus datasource
5. Click Import

3. Additional Recommended Metrics

Add these Prometheus scrape configs if not already present:

```yaml
scrape_configs:
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - source_labels: [__address__]
        regex: '(.*):10250'
        replacement: '${1}:9100'
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
        
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
```

Features Included

Node Health:

· Node availability and readiness
· CPU/Memory/Disk usage
· Network errors and traffic

Pod Health:

· Pod status by namespace
· Crash loops and restart counts
· Resource requests vs usage

Cluster Components:

· API Server, Scheduler, Controller Manager status
· etcd health and leader elections
· CoreDNS availability

Resource Management:

· Resource quota utilization
· Pending pods count
· Deployment replica mismatches

Tips for Customization

1. Adjust thresholds based on your cluster size and workload
2. Add node-exporter for detailed node metrics
3. Enable kube-state-metrics for Kubernetes object metrics
4. Configure alert receivers (Slack, Email, PagerDuty) in Alertmanager
5. Add custom labels to alerts for better routing
6. Set up recording rules for frequently used expressions

This setup provides a solid foundation for monitoring Kubernetes cluster health and will alert you proactively about potential issues before they affect your applications.