import { describe, expect, test } from "bun:test";
import { join, parse } from "node:path";
import { argsFromCli, projectReaStaticEvidence } from "../../scripts/audit/rea-application";

// Field names follow REA's published schemas; fixture hashes are NOT authenticated.
function fixture() {
  const sha = "b".repeat(64);
  const graphId = "jag_" + "c".repeat(64);
  return {
    evidence_id: "ev_" + "a".repeat(64),
    predicate_type: "rea.javascript-application-analysis",
    operation: "analyze_javascript_application",
    authority: "shipped-artifact", confidence: "derived",
    provider: { id: "rea-javascript-application", name: "REA JavaScript application analyzer", version: "1" },
    subject: { format: "asar", digest: { sha256: sha } },
    limitations: [] as string[],
    normalized_result: {
      format: "asar", root_artifact_sha256: sha,
      graph: { schema: "JavaScriptApplicationGraph", graph_id: graphId,
        nodes: [{node_id:"jag_node_"+"d".repeat(64)}],
        coverage: {status:"complete",truncated:false,omitted_count:0,
          limits:[] as {name:string;value:number;unit:string}[]},
        limitations:[] as string[],
      },
      semantic_graph: {
        schema:"JavaScriptSemanticRelationGraph",application_graph_id:graphId,
        root_artifact_sha256:sha,nodes:[{node_id:"jsrg_node_"+"e".repeat(64)}],
        unknowns:[] as unknown[],
        coverage:{status:"complete",truncated:false,omitted_nodes:0,omitted_relations:0,
          limits:[] as unknown[],families:["boundary","call-flow","child-process","closure",
            "configuration","data-flow","event","object-flow",
            "promise-ownership","request","resource-lifecycle","timer"].map(
            family=>({family,status:"complete",retained_relations:0,
              omitted_relations:0,unknown_ids:[]}))},
        limitations:[] as string[],
      },
      statistics:{parse_failures:0},integrity_contradictions:[] as unknown[],
      limitations:[] as string[],
    },
  };
}

describe("REA source Evidence projection: synthetic schema tests, not executable REA proof", () => {
  test("uses real graph.coverage.status and keeps native/visual unverified",()=>{
    expect(projectReaStaticEvidence(fixture())).toMatchObject({
      application_graph_coverage:"complete",semantic_graph_coverage:"complete",
      static_evidence_state:"REPORTED_COMPLETE_STATIC_ONLY",
      evidence_id_check:"FORMAT_ONLY_NOT_AUTHENTICATED",
      runtime_behavior:"NOT_OBSERVED",native_blockbench:"NOT_EXECUTED",
      visual_fidelity:"NOT_EVALUATED",source_acceptance:"NOT_EVALUATED",
    });
  });
  test("rejects old fake application_graph/coverage.state contract",()=>{
    const f=fixture();
    expect(()=>projectReaStaticEvidence({...f,normalized_result:{
      ...f.normalized_result,graph:undefined,application_graph:{coverage:{state:"complete"}},
    }})).toThrow("REA_EVIDENCE_INVALID");
    f.normalized_result.graph.coverage.status="bogus";
    expect(()=>projectReaStaticEvidence(f)).toThrow("REA_EVIDENCE_INVALID");
  });
  test("partial/truncated application graph cannot become complete",()=>{
    const f=fixture();
    f.normalized_result.graph.coverage.status="partial";
    f.normalized_result.graph.coverage.truncated=true;
    f.normalized_result.graph.coverage.omitted_count=5;
    f.normalized_result.graph.coverage.limits.push({name:"node-limit",value:100,unit:"items"});
    expect(projectReaStaticEvidence(f)).toMatchObject({
      application_graph_coverage:"partial",application_graph_truncated:true,
      static_evidence_state:"REPORTED_PARTIAL_OR_UNKNOWN",
    });
  });
  test("retains semantic uncertainty, omitted sources, parser and integrity failures",()=>{
    const f=fixture();
    f.normalized_result.semantic_graph.unknowns.push({id:"unresolved"});
    f.normalized_result.semantic_graph.coverage.families[0]!.status="unsupported";
    f.normalized_result.statistics.parse_failures=1;
    f.normalized_result.integrity_contradictions.push({reason:"hash-mismatch"});
    expect(projectReaStaticEvidence({...f,normalized_result:{
      ...f.normalized_result,source_selection:{requested_paths:["main.js"],unselected_files:2},
    }})).toMatchObject({
      semantic_unknown_count:1,semantic_incomplete_family_count:1,
      source_unselected_files:2,parse_failures:1,integrity_contradictions:1,
      static_evidence_state:"REPORTED_PARTIAL_OR_UNKNOWN",
    });
  });
  test("rejects false provenance, digest mismatch and contradictory coverage",()=>{
    const f=fixture();
    f.provider.id="other";
    expect(()=>projectReaStaticEvidence(f)).toThrow("REA_EVIDENCE_INVALID");
    f.provider.id="rea-javascript-application";
    f.normalized_result.semantic_graph.application_graph_id="wrong";
    expect(()=>projectReaStaticEvidence(f)).toThrow("REA_EVIDENCE_INVALID");
    f.normalized_result.semantic_graph.application_graph_id=f.normalized_result.graph.graph_id;
    f.normalized_result.root_artifact_sha256="0".repeat(64);
    expect(()=>projectReaStaticEvidence(f)).toThrow("REA_EVIDENCE_INVALID");
    const impossible=fixture();
    impossible.normalized_result.graph.coverage.truncated=true;
    expect(()=>projectReaStaticEvidence(impossible)).toThrow("REA_EVIDENCE_INVALID");
  });
  test("missing limitation arrays fail closed; preview does not hide omission count",()=>{
    const f=fixture();
    f.limitations=Array.from({length:10},(_,i)=>"unknown "+i);
    const x=projectReaStaticEvidence(f);
    expect(x.limitations_count).toBe(10);
    expect(x.limitations_preview).toHaveLength(8);
    expect(x.limitations_omitted).toBe(2);
    expect(x.static_evidence_state).toBe("REPORTED_PARTIAL_OR_UNKNOWN");
    expect(()=>projectReaStaticEvidence({...fixture(),limitations:null}))
      .toThrow("REA_EVIDENCE_INVALID");
  });
  test("outside-checkout absolute output normalization does not write",()=>{
    const out=join(parse(process.cwd()).root,"rea-static-evidence.json");
    expect(argsFromCli([process.cwd(),"--retain-evidence",out]).retain).toBe(out);
  });
});
