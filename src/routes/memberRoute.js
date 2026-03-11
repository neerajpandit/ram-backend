import express from "express";

import {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
} from "../controllers/memberController.js";
import { downloadMemberForm } from "../services/downloadForm.js";


// import { createMemberSchema } from "../validators/member.validator.js";

const router = express.Router();

router.post("/", createMember);

router.get("/", getMembers);

router.get("/:id", getMemberById);

router.put("/:id", updateMember);

router.delete("//:id", deleteMember);

router.get("/member-form/:memberId", downloadMemberForm);
export default router;
