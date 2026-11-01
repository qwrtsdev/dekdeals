export const repoUrl = "https://github.com/qwrtsdev/dekdeals";
export const issueUrl = `${repoUrl}/issues/new`;
export const supportUrl = "https://ko-fi.com/qwrts";
export const reportUrl = (id = "") => `${issueUrl}?title=${encodeURIComponent(`แจ้งปัญหา : ${id}`)}`;
