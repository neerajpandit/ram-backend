import express from 'express'
import { verifyJWT } from '../middlewares/authMiddleware.js';
import { createPrakoshth, getPrakoshths } from '../controllers/prakoshthController.js';



const router = express.Router();

router.post("/",createPrakoshth)
router.get("/",getPrakoshths)

export default router;