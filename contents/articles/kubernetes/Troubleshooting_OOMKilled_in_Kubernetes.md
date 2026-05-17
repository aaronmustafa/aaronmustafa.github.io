# Troubleshooting OOMKilled in Kubernetes

![Author Nashwan](https://img.shields.io/badge/Author-Nashwan%20Mustafa-7a2840.svg?style=flat-square)

---

## 📌 Overview

An **OOMKilled** error occurs when a container or process is terminated because it exceeds the memory limit allocated to it.  
This is a common issue in **Kubernetes** and **Docker** environments.  

This guide provides a step-by-step approach to diagnosing and resolving OOMKilled errors.

---

## 🔎 Step 1: Identify the Root Cause

1. **Check Logs**
   ```bash
   kubectl logs <pod_name>
   # or for Docker
   docker logs <container_id>
````

Review what the application was doing before termination.

2. **Inspect Events**

   ```bash
   kubectl describe pod <pod_name>
   ```

   Look for events related to **OOMKilled**.

3. **Monitor Resource Usage**

   * `kubectl top pods`
   * Use monitoring tools (Prometheus, Grafana, etc.) to analyze memory usage trends.

---

## 🛠️ Step 2: Increase Memory Limits (if needed)

If the application **genuinely needs more memory**, allocate additional resources.

Example **Pod/Deployment YAML**:

```yaml
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "1Gi"
```

Apply the changes:

```bash
kubectl apply -f <your_file>.yaml
```

---

## 🧹 Step 3: Optimize Application Memory Usage

* **Profile Memory Usage**

  * Java → `heapdump`, `jmap`
  * Python → `memory_profiler`
  * Other languages → use equivalent profilers

* **Fix Memory Leaks**
  Refactor code to release unused objects, reduce retention, and handle garbage collection properly.

* **Use Smaller Data Batches**
  Process large datasets in smaller chunks to avoid memory spikes.

---

## 💾 Step 4: Enable Swap Space (non-production only)

To reduce abrupt container termination (not recommended for production):

* **Docker**

  ```bash
  docker run --memory="1g" --memory-swap="2g" <image_name>
  ```

* **Kubernetes Nodes**
  Ensure the underlying node OS has sufficient swap enabled (if allowed in your environment).

---

## 📈 Step 5: Use Horizontal Scaling

If one instance cannot handle the workload, **scale replicas**:

```bash
kubectl scale deployment <deployment_name> --replicas=3
```

This distributes workload across multiple pods instead of overloading one.

---

## 🖥️ Step 6: Check Node Resources

1. **Inspect Node Memory**

   ```bash
   kubectl describe node <node_name>
   ```

   Verify if enough memory is available.

2. **Add Nodes**
   If the cluster is under memory pressure, consider adding more worker nodes.

---

## 🎯 Step 7: Set Memory Limits Above Peak Usage

* Profile your app’s **maximum memory usage**.
* Set Kubernetes limits slightly **above peak usage** to avoid premature OOMKills.
* Example: If peak usage is \~900Mi, set limit at **1Gi**.

---

## 🧩 Step 8: Troubleshoot Specific Scenarios

* **Java Applications**
  Configure heap size:

  ```bash
  java -Xmx512m -jar app.jar
  ```

* **Python Applications**

  * Use lightweight libraries.
  * Avoid large in-memory data structures.

* **Database Applications**

  * Optimize queries.
  * Implement connection pooling.

---

## ✅ Summary

To resolve and prevent **OOMKilled** errors:

* Start with **diagnostics** (logs, events, metrics).
* Apply **resource adjustments** (increase limits, optimize code).
* Use **scaling strategies** (horizontal scaling, add nodes).
* Tune **application-specific memory settings**.

By combining these approaches, you can achieve **stable, efficient, and resilient Kubernetes workloads**.

---

