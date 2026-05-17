### Istio Ambient Mode

![Author Nashwan](https://img.shields.io/badge/Author-Nashwan%20Mustafa-7a2840.svg?style=flat-square)

Istio Ambient Mode offers an alternative deployment architecture that eliminates the need for sidecar proxies by using a "split proxy" model. Instead of injecting a proxy into every application pod, traffic is managed by external Layer 4 (Ztunnel) and Layer 7 (Waypoints) proxies. This approach reduces resource consumption, simplifies deployments, and improves operational efficiency by avoiding the complexity of maintaining sidecars.

However, there are tradeoffs. Ambient Mode may limit the granularity and flexibility offered by sidecar-based Istio, where traffic management and security can be fine-tuned at a per-pod level. It also operates on a newer, less mature architecture, meaning some features are still evolving compared to the established sidecar model.

In summary, Istio Ambient Mode helps reduce resource overhead and simplifies the management of service meshes, making it more efficient for scaling. The tradeoff is potentially reduced fine-grained control and working with a newer, evolving technology. This simplicity and reduced overhead also lead to cloud cost savings, as fewer resources are needed to manage the mesh.

### How Does Ambient Mesh Work?
- A shared agent (ztunnel) is present on each node in the Kubernetes cluster, responsible for secure connections within the mesh.

<img width="50%" align="centre" alt="Github" src="./contents/articles/images/ambient-2.gif" />

- Ztunnel processes only L4 traffic, separating Istio’s data plane from application concerns.
- A zero-trust overlay (with mTLS, telemetry, authentication, and L4 authorization) is established when the ambient mode is activated for a namespace.
- For L7 features, a namespace can deploy one or more Envoy-based waypoint proxies. These proxies can be auto-scaled according to real-time traffic demand.

<img width="50%" align="centre" alt="Github" src="./contents/articles/images/ambient-3.gif" />

### Security Considerations
Ambient Mesh prioritizes security:

- Ztunnel: Although a shared resource, the ztunnel limits its keys to workloads on its node, keeping a low-risk profile.
- Waypoint Proxies: These shared resources are confined to one service account, reducing potential damage from a compromised proxy.
- Envoy’s Role: With its robust, battle-tested nature, Envoy is considered more secure than many applications it pairs with.

### Performance and Resource Implications
- Resource Efficiency: Ambient Mesh’s ztunnel reduces the per-workload reservations. Dynamic scaling of waypoint proxies also ensures resource optimization.
- Latency Concerns: While there’s a perception that waypoint proxies might introduce latency, Istio believes this is balanced out by reduced L7 processing compared to the traditional sidecar model.

### How Does Istio Ambient Mode Reduce Cloud Cost

Istio Ambient Mode reduces cloud costs in several ways, specifically by eliminating the need for sidecar proxies in its architecture. When it comes to processing logs, particularly sidecar logs being sent to services like AWS CloudWatch, the impact can be significant. Here's how it works and why it matters:

#### 1. **Eliminating Sidecar Proxies**
   - **Traditional Istio with Sidecar Proxies**: In traditional Istio, each pod has its own sidecar proxy (typically Envoy) attached to it. These proxies handle networking tasks such as traffic routing, security, and observability for each service. This means each sidecar generates logs for network traffic, security policies, and more, all of which need to be processed and potentially sent to an external logging service like CloudWatch.
   - **Impact on Costs**: Processing these logs increases cloud costs due to:
     - **Increased CPU/Memory Usage**: The sidecars consume compute resources, driving up the cost of running your Kubernetes clusters.
     - **High Volume of Logs**: Each sidecar generates a significant volume of logs, which can lead to higher costs for storage and log ingestion in services like AWS CloudWatch.
     - **Log Shipping**: Moving these logs from the sidecars to cloud logging services involves network bandwidth and additional resources for log agents like Fluentd or Fluent Bit.

   - **Ambient Mode without Sidecar Proxies**: In Istio Ambient Mode, the sidecars are removed entirely. Instead of each pod having its own proxy, the traffic management and security functions are handled at the node or network level (using a combination of node-level proxies and a Ztunnel component for security). This means there are no sidecar logs to process and send to CloudWatch, reducing both resource usage and log volume.

#### 2. **Reduced Log Volume**
   - **Traditional Mode**: In a large mesh with many services, the logs from all these sidecar proxies can add up quickly. Each log contains information about every request, response, security policy, and more. Processing this data, especially for high-traffic environments, can be expensive.
   - **Ambient Mode**: Since there are no sidecar proxies, there's a significant reduction in the number of logs being generated. The traffic logging now happens at a higher level (i.e., in the ztunnel or node proxy), and there are fewer components generating logs.

#### 3. **Lower Compute Costs**
   - **Traditional Mode**: Each sidecar proxy consumes compute and memory resources in every pod. These resources scale with the number of services in your mesh, increasing overall compute costs in cloud environments like AWS.
   - **Ambient Mode**: By eliminating sidecar proxies, you reduce the overhead on each pod, lowering the overall compute and memory requirements in your cluster. This, in turn, reduces the cost of running your workloads on cloud infrastructure.

#### 4. **Reduced Log Processing Overhead**
   - **Log Shipping Agents**: In traditional Istio, log shipping agents (e.g., Fluent Bit, Fluentd) have to collect logs from every sidecar. This adds to the CPU and memory overhead on nodes, as the agents process, filter, and send these logs to services like CloudWatch.
   - **Ambient Mode**: With no sidecars, there is less log data to process, reducing the resource demand on log shipping agents and further lowering costs.

#### 5. **Smaller CloudWatch Bills**
   - **Log Ingestion Costs**: CloudWatch charges based on the volume of logs ingested and the storage of these logs. With fewer logs being generated (due to the absence of sidecar proxies), there is less data to ingest, store, and process. This leads to a direct reduction in CloudWatch costs.
   - **Long-term Storage**: Logs often need to be stored for auditing or compliance purposes. Fewer logs mean smaller storage requirements, reducing long-term storage costs in services like CloudWatch Logs or S3.

#### Summary of Cost Reduction Benefits
- **Lower CPU and Memory Usage**: By removing sidecars, Ambient Mode significantly reduces the compute resources required per pod, which leads to lower cloud infrastructure costs.
- **Reduced Log Volume**: Without sidecars, there are fewer logs to process and store, directly reducing costs for logging services like CloudWatch.
- **Simplified Log Management**: Since there are fewer components generating logs, the complexity and overhead associated with log management are reduced.
- **Lower Network Traffic for Logs**: Fewer logs mean less network bandwidth is consumed when shipping logs to external services.

In essence, **Istio Ambient Mode** optimizes performance and costs by reducing the overhead and log volume generated by sidecar proxies, leading to lower cloud costs, especially when logging to services like AWS CloudWatch.
