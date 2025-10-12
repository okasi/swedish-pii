"use client";
import { useState, useEffect, useRef } from "react";
import debounce from "@/utils/debounce";
import { MaskedData, maskPII } from "@/utils/maskPII";

export default function Home() {
  const [inputText, setInputText] = useState<string>("");
  const [maskedText, setMaskedText] = useState<string>("");
  const [maskedData, setMaskedData] = useState<MaskedData>({});

  // Debounce with useRef so it's not recreated on every render
  const debouncedMaskPII = useRef(
    debounce((text: string) => {
      const { maskedText, maskedData } = maskPII(text);
      setMaskedText(maskedText);
      setMaskedData(maskedData);
    }, 389)
  ).current;

  useEffect(() => {
    debouncedMaskPII(inputText);
  }, [inputText, debouncedMaskPII]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-16 bg-slate-100">
      <div className="w-full max-w-xl space-y-4">
        <div>
          <h1 className="font-medium text-center text-xl">
            Swedish
            <br />
            Personal Identifiable Information (PII)
            <br />
            Detection & Masking
          </h1>
        </div>
        <div className="!mt-8">
          <label
            htmlFor="editable-input"
            className="block text-sm font-medium text-gray-800"
          >
            Editable Input
          </label>
          <textarea
            id="editable-input"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md h-32"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="masked-output"
            className="block text-sm font-medium text-gray-800"
          >
            Masked Output
          </label>
          <textarea
            id="masked-output"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md h-32 whitespace-pre-wrap text-wrap"
            value={maskedText}
            readOnly
          />
        </div>
        <div>
          <label
            htmlFor="masked-data"
            className="block text-sm font-medium text-gray-800"
          >
            PII Data
          </label>
          <div
            id="masked-data"
            className="p-4 border border-gray-300 rounded-md bg-white"
          >
            <pre>{JSON.stringify(maskedData, null, 2)}</pre>
          </div>
        </div>
      </div>
    </main>
  );
}