/**
 * React Native's FormData accepts a local file as `{ uri, name, type }` and streams it
 * from disk. The DOM lib typing only knows `string | Blob`, so this adds the native
 * overload (declaration merging — no casts at call sites).
 */
interface ReactNativeFormDataFile {
  uri: string;
  name: string;
  type: string;
}

interface FormData {
  append(name: string, value: ReactNativeFormDataFile): void;
}
