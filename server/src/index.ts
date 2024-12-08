import express from "express";
import multer from "multer";
import pdf from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import cors from "cors";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const generatePromt = (resume: string) => `
  Please review the following resume and rate it out of 10. Consider the candidate's skills, experience, education, and any additional factors that are relevant to the specific niche/industry. The goal is to assess the candidate's qualifications for a [specific industry/role, e.g., software development, marketing, graphic design, etc.].
  Skills: Does the candidate have the necessary technical or soft skills for this niche?
  Experience: Is the candidate's experience relevant and sufficient for the role? Are there any standout achievements or weaknesses?
  Education and Certifications: How relevant and strong is the candidate’s educational background and certifications in relation to the niche?
  Additional Factors: Consider any additional factors like personal projects, involvement in the community, or contributions that are relevant to the niche.
  Please provide a score between 1 and 10 with an explanation for the rating.
  
  This is the resume:
  ${resume}
  `;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

app.get("/", (req, res) => {
  res.json({ status: "resume-review is Live 🎉" });
});

app.post("/review", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "please upload resume" });
      return;
    }

    const resumeBuffer = req.file.buffer;
    const parsedResume = await pdf(resumeBuffer);
    const parsedText = parsedResume.text;

    const result = await model.generateContentStream(generatePromt(parsedText));

    // Set up the response headers for server sent events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // for await (const chunk of result.stream) {
    //   console.log(chunk);
    //   const chunkText = chunk.text();
    //   // res.write(chunkText);
    // }

    // Send chunks as they arrive
    for await (const chunk of result.stream) {
      if (chunk.candidates && chunk.candidates.length > 0) {
        const text = chunk.candidates[0].content?.parts?.[0].text || " ";
        console.log(text);
        res.write(text);
      }
    }

    res.end();
  } catch (error) {
    console.log(error);
  }
});

app.listen(8000, () => {
  console.log(`server listening on port: ${8000}`);
});
