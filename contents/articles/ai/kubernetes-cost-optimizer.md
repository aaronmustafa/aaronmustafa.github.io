# Kubernetes Cost Optimizer

Kubernetes cost management is one of those areas where teams often have the data, but not a fast or usable way to turn that data into action.

This project explores that problem through an agentic AI application that analyses Kubernetes spend, runs a seven-step optimisation pipeline, streams progress to the UI in real time, and produces a FinOps-style report. It is designed to feel interactive and operational, while still being practical to run locally or in Kubernetes.

The application combines a React frontend, an Express backend, and a deployment model that works both for local development and for cluster-based execution. When an Anthropic API key is available, the reporting layer uses Anthropic for synthesis. When it is not, the backend falls back to a deterministic offline generator so the tool remains usable without external model access.

## What Problem It Solves

Many cost tools tell you where spend exists, but they do not provide a workflow that feels close to how operators investigate and explain optimisation opportunities. In practice, teams often need more than a dashboard:

- a step-by-step analysis process
- a way to inspect what the system is doing
- a readable output that can support platform and FinOps conversations

This project addresses that gap by packaging cost analysis as an agent-style workflow. Instead of producing a single opaque result, it exposes the sequence of analysis steps and streams them live to the interface.

## Project Highlights

- Agentic AI workflow for Kubernetes cost analysis
- Seven-step optimisation pipeline with structured stage output
- Live Server-Sent Events stream for real-time operator visibility
- Anthropic-backed report synthesis with deterministic offline fallback
- Local development workflow with separate frontend and backend
- Containerised packaging for consistent deployment
- Kubernetes manifests for cluster deployment

## Architecture

The project is organised into a few clean components:

### Frontend

`frontend/` contains a React and Vite-based operator console. It presents the analysis workflow, consumes live SSE updates, and renders the agent progress in a way that feels more like an active terminal than a static form.

### Backend

`backend/` contains an Express API responsible for running the optimisation workflow and building the final report. This is where the agent pipeline logic lives.

### Deployment Assets

`deploy/kubernetes/` contains the Kubernetes manifests needed to deploy the application itself.

### Container Build

The `Dockerfile` uses a multi-stage build to compile the frontend and package the backend into a single runtime image, which keeps deployment straightforward.

## Agent Pipeline

The backend runs the following tools in sequence:

1. `analyze_node_utilization`
2. `detect_idle_resources`
3. `rightsizing_analysis`
4. `spot_instance_scan`
5. `namespace_cost_breakdown`
6. `reservation_optimizer`
7. `generate_report`

Each stage emits structured logs over Server-Sent Events so the UI can show a live, progressive execution flow rather than waiting for a single final response.

That design makes the application useful not only as a reporting tool, but also as a demonstration of how agentic workflows can be exposed transparently in operator-facing systems.

## Local Development

To run the application locally:

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to the backend on `http://localhost:8080`.

## Environment

Copy `.env.example` to `backend/.env` or export the values in your shell.

Main variables:

- `ANTHROPIC_API_KEY`: optional; if omitted, the backend uses the offline deterministic report generator
- `ANTHROPIC_MODEL`: the Anthropic model used for report synthesis
- `PORT`: backend runtime port

This is a useful pattern because it allows the same project to work in both connected and disconnected-style environments.

## Container Build

To build and run the container locally:

```bash
docker build -t k8s-cost-optimizer:latest .
docker run -p 8080:8080 --env-file backend/.env k8s-cost-optimizer:latest
```

## Kubernetes Deployment

To deploy it into Kubernetes, first create the namespace and secret:

```bash
kubectl create namespace finops
kubectl create secret generic k8s-cost-optimizer-secrets \
  --namespace finops \
  --from-literal=ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
kubectl apply -f deploy/kubernetes/
```

This gives you a clean path from local experimentation to in-cluster deployment without changing the overall application model.

## Production Notes

There are a few practical design details worth calling out:

- The current telemetry layer can generate a realistic cluster snapshot when live cluster credentials are not wired in yet
- To use live cluster data, `buildClusterTelemetry` in `backend/src/services/telemetry.js` can be replaced with Kubernetes metrics and cloud billing API integrations
- SSE run state is currently in memory, so Redis or Postgres would be a better fit for horizontal scaling across replicas

These are sensible trade-offs for an application that is part demo, part reference implementation, and part practical operator tool.

## Why This Is Interesting

This project is a good example of where AI, platform engineering, and FinOps can meet in a useful way.

It is not just “AI on top of Kubernetes.” It demonstrates:

- agent-style orchestration in an operational workflow
- human-visible execution stages
- practical fallback behaviour when model access is unavailable
- a deployment path that works locally and in-cluster

That makes it a strong hands-on example for anyone exploring AI-enabled platform tooling rather than purely chat-style user experiences.

## Repository

You can explore the code here:

[github.com/nbmustafa/k8s-finizer](https://github.com/nbmustafa/k8s-finizer)

## Final Thoughts

Projects like this are useful because they turn abstract ideas like “agentic AI” into something concrete: a system that reads platform signals, executes a visible workflow, and produces an output an engineer can act on.

If you are experimenting with AI in platform engineering, FinOps, or operator tooling, this is the kind of pattern worth building on.
