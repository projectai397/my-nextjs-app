"use client"
import dynamic from "next/dynamic";
const DepositReqPage = dynamic(() => import("@/components/payment/depositReq-page"), { ssr: false });
export default function DepositeReqPage()
{
    return(
        <DepositReqPage/>
    )
}