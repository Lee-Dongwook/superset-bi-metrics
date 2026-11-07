class TypedRegistry<TYPEMAP extends {}> {
  name = "TypedRegistry";

  private records: TYPEMAP;

  constructor(initialRecords: TYPEMAP) {
    this.records = initialRecords;
  }

  get<K extends keyof TYPEMAP>(key: K): TYPEMAP[K] {
    return this.records[key];
  }

  set<K extends keyof TYPEMAP>(key: K, value: TYPEMAP[K]) {
    this.records[key] = value;
  }
}

export default TypedRegistry;
