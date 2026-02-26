import Image from "next/image";
import DIDAgent from "@/app/components/didagent";
export default function Home() {
    return (
        <>
            <div className="wrapper" id="wrapper-id"></div>
            <DIDAgent/>
        </>
    );
}
