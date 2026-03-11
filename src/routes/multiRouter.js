import express from 'express'
import { verifyJWT } from '../middlewares/authMiddleware.js';
import { createDistrict, createState, getDistricts, getStates } from '../controllers/multiController.js';



const router = express.Router();

router.post("/",createState)
router.get("/get-state",getStates);


router.post("/", createDistrict);
router.get("/get-dist",getDistricts);


export default router;