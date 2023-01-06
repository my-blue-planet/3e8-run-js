// https://www.html5rocks.com/en/tutorials/workers/basics/#toc-inlineworkers

import fs from "fs"

const parseFile = (p)=>{
	return fs
		.readFileSync(p, {encoding: "utf8"})
		.replaceAll("$", "__DOLLARSIGN__")
		.replaceAll('\\', '\\\\')
		.replaceAll('`', '\\`')
}
const maincode = fs.readFileSync("./src/runJs.js", {encoding: "utf8"})
const workercode = parseFile("./src/js.worker.js")

const maincodeOut = maincode.replace(`"__MYWORKERCODE__"`, "`"+workercode+"`").replaceAll("__DOLLARSIGN__", "\\$")


fs.writeFileSync("./toNPM/runJs.js", maincodeOut, {encoding: "utf8"})
fs.copyFileSync("./src/runJs.d.ts", "./toNPM/runJs.d.ts")
fs.copyFileSync("./src/js.worker.d.ts", "./toNPM/js.worker.d.ts")