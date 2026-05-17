# Kubernetes Sandbox

If you want a fast, repeatable way to stand up a local Kubernetes environment with GitOps and monitoring included, this pattern is designed for exactly that.

This sandbox bootstrap packages a complete local platform setup into a single script. It creates a Kind cluster, installs ArgoCD, deploys a monitoring stack, and uses locally stored Helm charts so the environment can be recreated consistently without depending on external chart pulls during deployment.

It is a practical reference for platform engineers who want a lightweight but production-inspired sandbox for testing platform workflows, GitOps patterns, observability, and application deployment behaviour.

## Why This Setup Is Useful

Many local Kubernetes demos stop at cluster creation. That is useful for quick testing, but it does not reflect how modern platform teams actually work. In real environments, we care about repeatability, GitOps, visibility, and clear operational workflows from the beginning.

This sandbox is built around those ideas:

- A single command boots the full environment
- Helm charts are downloaded and stored locally
- ArgoCD provides declarative GitOps-driven application management
- Prometheus and Grafana provide immediate monitoring visibility
- Common local access is handled through localhost port mappings

The result is a self-contained platform sandbox that feels much closer to a real engineering environment than a minimal local cluster.

## What You Get

The bootstrap provisions a local Kubernetes environment with the following components:

### Kind Cluster

A local cluster named `sandbox-cluster` that provides the base environment for the rest of the stack.

### ArgoCD

ArgoCD is used as the GitOps control plane. This makes the sandbox useful not only for cluster experimentation, but also for testing declarative delivery patterns and application reconciliation workflows.

### Prometheus and Grafana

The monitoring stack provides visibility into cluster and workload behaviour from the start. That makes the environment much more useful for observability testing, troubleshooting practice, and platform experimentation.

### Local Helm Charts

Rather than depending on remote chart repositories during deployment, charts are downloaded and stored locally. This makes the setup more predictable, easier to customise, and more resilient for repeat use.

## Key Features

- One-command setup through a single bootstrap script
- GitOps-ready platform using ArgoCD
- Prometheus and Grafana included from the start
- Local Helm chart structure for repeatable deployment
- Port-forwarded and localhost-accessible services
- Suitable for offline-style reuse after the initial chart download
- Structured in a way that reflects practical platform engineering patterns

## Prerequisites

Before running the bootstrap, install the following tools:

| Tool | Recommended Version |
|------|---------------------|
| Docker | 20.10+ |
| kubectl | 1.28+ |
| Helm | 3.12+ |
| Kind | 0.20+ |

You can install them using your package manager of choice. On macOS, Homebrew is the easiest route:

```bash
brew install docker kubectl helm kind
```

On Linux, install Docker, `kubectl`, Helm, and Kind using the official installation guides for your distribution.

## Quick Start

Once the repository is available locally, the flow is intentionally simple:

```bash
git clone <sandbox-repository>
cd <sandbox-repository>
./bootstrap.sh
```

After the bootstrap completes, the main services are available locally:

- ArgoCD: `http://localhost:8080`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`
- Alertmanager: `http://localhost:9093`

## Typical Directory Layout

After the bootstrap prepares the environment, the repository structure will look similar to this:

```text
.
├── bootstrap.sh
├── cleanup.sh
├── helm-charts/
│   ├── argocd/
│   ├── prometheus/
│   └── grafana/
└── manifests/
    ├── argocd-apps/
    └── configs/
```

This keeps the setup easy to understand and easy to extend. Charts, manifests, and bootstrap logic remain clearly separated.

## What Gets Deployed

The bootstrap is designed to stand up a useful platform baseline rather than only a bare cluster.

### 1. Local Kubernetes Cluster

- A Kind cluster named `sandbox-cluster`
- Local port mappings for the main platform services
- A lightweight but practical environment for platform and application testing

### 2. GitOps Platform

- ArgoCD in its own namespace
- Automated sync and reconciliation patterns
- A usable local UI for observing GitOps behaviour

### 3. Monitoring Stack

- Prometheus Operator
- Prometheus
- Alertmanager
- Node-level and cluster-level metrics
- Grafana dashboards for quick visibility

## Common Operations

Once the environment is running, these are the commands you will use most often:

```bash
# View all pods
kubectl get pods -A

# Check ArgoCD applications
kubectl get applications -n argocd

# Check services
kubectl get svc -n argocd
kubectl get svc -n monitoring
```

If port forwarding is needed manually:

```bash
# ArgoCD
kubectl port-forward -n argocd svc/argocd-server 8080:80

# Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

## Customisation Ideas

This setup is intentionally easy to evolve. Some common extensions include:

- adjusting ArgoCD values for different local workflows
- tuning Prometheus and Grafana configuration
- changing the Kind cluster layout or port mappings
- adding extra ArgoCD applications
- introducing custom Grafana dashboards
- experimenting with alert rules or additional scrape configurations

Because the charts are local, those changes are straightforward and easy to version.

## Cleanup

When you are finished, you can remove the whole environment with:

```bash
./cleanup.sh
```

Or directly with Kind:

```bash
kind delete cluster --name sandbox-cluster
```

## Troubleshooting

If the bootstrap fails, start with the basics:

```bash
docker info
kind version
kubectl version
bash -x ./bootstrap.sh
```

For pod-level issues:

```bash
kubectl get pods -n argocd
kubectl get pods -n monitoring
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```

This usually gives enough information to diagnose dependency, image, or readiness problems quickly.

## Production Perspective

Although this is a sandbox, the structure reflects useful production-minded ideas:

- repeatable platform bootstrap
- GitOps-managed application delivery
- monitoring included from day one
- local chart control instead of runtime dependency on remote repositories
- clear separation between infrastructure bootstrapping and application deployment

That makes it a strong learning environment and a good reference pattern for engineers building internal platform tooling.

## Try It Yourself

This article is intended to accompany the actual sandbox codebase so others can try it locally.

**Repository link:** [github.com/nbmustafa/k8s-bootstrap](https://github.com/nbmustafa/k8s-bootstrap/)

When I get some free time, I will turn this sandbox into:

- a reusable public GitHub template
- a cleaner multi-app GitOps demo
- a platform engineering workshop environment
- a local MLOps or AI sandbox built on the same pattern
