/// <reference types="blockbench-types" />

type RuntimeMutableBarItem = BarItem & {
  get?: () => unknown;
  set?: (value: unknown) => unknown;
  change?: (value: unknown) => unknown;
  update?: () => unknown;
  value?: unknown;
};

export function setBarItemValues(values: Record<string, unknown>): void {
  const rows=Object.entries(values).map(([id,value])=>{
    const item=(typeof BarItems === "undefined" ? undefined : BarItems[id]) as RuntimeMutableBarItem | undefined;
    if(!item)throw new Error(`Required paint control "${id}" is unavailable.`);
    if(typeof item.set!=="function" && typeof item.change!=="function" && !("value" in item))throw new Error(`Paint control "${id}" has no supported setter.`);
    const previous=typeof item.get==="function"?item.get():item.value;
    if(!["number","boolean","string"].includes(typeof previous))throw new Error(`Paint control "${id}" cannot be safely snapshotted.`);
    return {id,value,previous};
  });
  let attempted=-1;
  try{
    for(let i=0;i<rows.length;i++){attempted=i;setBarItemValue(rows[i].id,rows[i].value);}
  }catch(error){
    const failures:string[]=[];
    for(let i=attempted;i>=0;i--){
      try{setBarItemValue(rows[i].id,rows[i].previous);}catch{failures.push(rows[i].id);}
    }
    if(failures.length)throw new Error(`Paint settings failed; rollback failed for ${failures.join(", ")}. Inspect state before retrying. Cause: ${String(error)}`);
    throw error;
  }
}

export function setBarItemValue(id: string, value: unknown): void {
  const item = (typeof BarItems === "undefined" ? undefined : BarItems[id]) as RuntimeMutableBarItem | undefined;
  if (!item) throw new Error(`Required paint control "${id}" is unavailable.`);

  if (typeof NumSlider !== "undefined" && item instanceof NumSlider && typeof value === "number") {
    item.change(() => value);
    item.update();
    return;
  }

  if (typeof item.set === "function") {
    item.set(value);
    return;
  }

  if ("value" in item) {
    item.value = value;
    if (typeof item.update === "function") item.update();
    return;
  }

  if (typeof item.change === "function") {
    item.change(value);
    return;
  }
  throw new Error(`Paint control "${id}" has no supported setter.`);
}
