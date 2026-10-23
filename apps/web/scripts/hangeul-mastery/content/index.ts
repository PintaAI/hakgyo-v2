// The Hangeul Mastery course, module by module. The importer reads this
// object; module and item keys are stable ids (see ../content-types.ts).
import type { CourseContent } from "../content-types";
import { m0Welcome } from "./m0-welcome";
import { m1BasicVowels } from "./m1-basic-vowels";
import { m2CoreConsonants } from "./m2-core-consonants";
import { m3YVowels } from "./m3-y-vowels";
import { m4AspiratedTense } from "./m4-aspirated-tense";
import { m5WVowels } from "./m5-w-vowels";
import { m6ReadingWriting } from "./m6-reading-writing";
import { m7BatchimBasics } from "./m7-batchim-basics";
import { m8BatchimRules } from "./m8-batchim-rules";
import { m9FinalExam } from "./m9-final-exam";

export const hangeulMasteryCourse: CourseContent = {
  title: "Hangeul Mastery",
  description:
    "Fondasi membaca dan menulis Hangeul sebelum memulai perjalanan belajar bahasa Korea.",
  modules: [
    m0Welcome,
    m1BasicVowels,
    m2CoreConsonants,
    m3YVowels,
    m4AspiratedTense,
    m5WVowels,
    m6ReadingWriting,
    m7BatchimBasics,
    m8BatchimRules,
    m9FinalExam,
  ],
};

export default hangeulMasteryCourse;
