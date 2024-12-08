"use client";

import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ResumeReview = () => {
  const [resume, setResume] = useState<File | null>(null);
  const [responseText, setResponseText] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setResume(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!resume) {
      alert("Please select a resume to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resume);

    try {
      const response = await fetch("http://localhost:8000/review", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error("Failed to upload file:", response.statusText);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      setResponseText("");

      while (true) {
        if (!reader) throw new Error("no reader");
        const { value, done } = await reader.read();
        if (done) break;
        setResponseText((prev) => prev + decoder.decode(value));
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
      setResponseText("Failed to process resume.");
    }
  };

  return (
    <div>
      <h1>Resume Review</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />
        <button type="submit">Submit</button>
      </form>
      <div>
        <h2>Response</h2>
        <Markdown remarkPlugins={[remarkGfm]} className="flex flex-col gap-4">
          {responseText}
        </Markdown>
      </div>
    </div>
  );
};

export default ResumeReview;
