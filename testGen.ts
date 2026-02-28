async function testGenerateFull() {
    console.log("Testing Agent Generation API for 100 agents...");
    const startTime = Date.now();
    try {
        const res = await fetch("http://localhost:3000/api/generateAgents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ count: 100 })
        });

        const text = await res.text();
        console.log(`Time: ${(Date.now() - startTime) / 1000}s`);
        console.log(`Status: ${res.status}`);

        if (res.status === 200) {
            const data = JSON.parse(text);
            console.log(`Successfully generated ${data.citizens?.length} citizens.`);
        } else {
            console.log(`Response error: ${text}`);
        }
    } catch (e) {
        console.error(e);
    }
}

testGenerateFull();
