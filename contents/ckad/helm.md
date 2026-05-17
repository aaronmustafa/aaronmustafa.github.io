# Managing Kubernetes with Helm

- Note: Helm is part of the new CKAD syllabus. Here are a few examples of using Helm to manage Kubernetes.

## Helm in K8s

### Creating a basic Helm chart
```bash
helm create chart-test ## this would create a helm 
```

### Running a Helm chart
```bash
helm install -f myvalues.yaml myredis ./redis
```

### Find pending Helm deployments on all namespaces
```bash
helm list --pending -A
```

### Uninstall a Helm release
```bash
helm uninstall -n namespace release_name
```

### Upgrading a Helm chart
```bash
helm upgrade -f myvalues.yaml -f override.yaml redis ./redis
```

### Using Helm repo
Add, list, remove, update and index chart repos

```bash
helm repo add [NAME] [URL]  [flags]

helm repo list / helm repo ls

helm repo remove [REPO1] [flags]

helm repo update / helm repo up

helm repo update [REPO1] [flags]

helm repo index [DIR] [flags]
```

### Download a Helm chart from a repository 
```bash
helm pull [chart URL | repo/chartname] [...] [flags] ## this would download a helm, not install 
helm pull --untar [rep/chartname] # untar the chart after downloading it 
```

### Add the Bitnami repo at https://charts.bitnami.com/bitnami to Helm 
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
```
  
### Write the contents of the values.yaml file of the `bitnami/node` chart to standard output  
```bash
helm show values bitnami/node
```

### Install the `bitnami/node` chart setting the number of replicas to 5
To achieve this, we need two key pieces of information:
- The name of the attribute in values.yaml which controls replica count
- A simple way to set the value of this attribute during installation

To identify the name of the attribute in the values.yaml file, we could get all the values, as in the previous task, and then grep to find attributes matching the pattern `replica`
```bash
helm show values bitnami/node | grep -i replica
```
which returns
```bash
## @param replicaCount Specify the number of replicas for the application
replicaCount: 1
```
 
We can use the `--set` argument during installation to override attribute values. Hence, to set the replica count to 5, we need to run
```bash
helm install mynode bitnami/node --set replicaCount=5
```


#### Contents

- [Core Concepts - 13%](https://nbmustafa.github.io/contents/ckad/ckad_core_concepts)
- [Multi-container pods - 10%](https://nbmustafa.github.io/contents/ckad/multi_container_pod)
- [Pod design - 20%](https://nbmustafa.github.io/contents/ckad/pod_design)
- [Configuration - 18%](https://nbmustafa.github.io/contents/ckad/configuration)
- [Observability - 18%](https://nbmustafa.github.io/contents/ckad/observability)
- [Services and networking - 13%](https://nbmustafa.github.io/contents/ckad/services_and_networking)
- [State persistence - 8%](https://nbmustafa.github.io/contents/ckad/state_persistence)
- [Home Page](https://nbmustafa.github.io)
