const axios = require('axios');

const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000/api';
const email =
  process.env.TEST_EMAIL || `smoke+${Date.now()}@example.com`;
const password = process.env.TEST_PASSWORD || 'P@ssw0rd!2025';
const contractSlug = process.env.CONTRACT_SLUG || null;
const contractCategory = process.env.CONTRACT_CATEGORY || 'employment';
const userMessage =
  process.env.TEST_MESSAGE ||
  'We want a simple contract for a full-time analyst role.';

async function signupOrLogin() {
  try {
    const res = await axios.post(`${baseUrl}/auth/signup`, {
      email,
      password,
      full_name: 'Smoke Test',
      company_name: 'Smoke Co',
    });
    return res.data.access_token;
  } catch (err) {
    const status = err.response?.status;
    if (status !== 409) {
      throw err;
    }
  }

  const login = await axios.post(`${baseUrl}/auth/login`, {
    email,
    password,
  });
  return login.data.access_token;
}

async function getContractType() {
  if (contractSlug) {
    const res = await axios.get(`${baseUrl}/contract-types`, {
      params: { limit: 50 },
    });
    const found = res.data.find((ct) => ct.slug === contractSlug);
    if (!found) {
      throw new Error(`Contract type slug not found: ${contractSlug}`);
    }
    return found;
  }

  const res = await axios.get(`${baseUrl}/contract-types`, {
    params: { category: contractCategory, limit: 1 },
  });
  if (!res.data.length) {
    const fallback = await axios.get(`${baseUrl}/contract-types`, {
      params: { limit: 1 },
    });
    if (!fallback.data.length) {
      throw new Error('No contract types available.');
    }
    return fallback.data[0];
  }

  return res.data[0];
}

async function main() {
  const token = await signupOrLogin();
  const headers = { Authorization: `Bearer ${token}` };

  const contractType = await getContractType();
  const draftRes = await axios.post(
    `${baseUrl}/contracts`,
    { contractTypeId: contractType.id },
    { headers },
  );

  const draft = draftRes.data;
  await axios.post(
    `${baseUrl}/contracts/${draft.id}/start`,
    { answers: {} },
    { headers },
  );

  const msgRes = await axios.post(
    `${baseUrl}/contracts/${draft.id}/messages`,
    { sender: 'user', message: userMessage },
    { headers },
  );

  const answers = {
    employer_name: 'Acme Pty Ltd',
    employee_name: 'Jane Doe',
    job_title: 'Analyst',
    base_salary: 90000,
    commencement_date: '2025-01-01',
    salary_amount: 90000,
    employment_type: 'Full-time',
    start_date: '2025-01-01',
  };

  const genRes = await axios.post(
    `${baseUrl}/contracts/${draft.id}/generate`,
    { answers },
    { headers },
  );

  const result = genRes.data;
  const text = result.ai_draft_text || '';
  const snippet = text.slice(0, 300);

  console.log('Smoke test complete');
  console.log(`Draft ID: ${draft.id}`);
  console.log(`Contract Type: ${contractType.name}`);
  console.log(`Assistant message count: ${msgRes.data.chatMessages?.length || 0}`);
  console.log(`Generated text length: ${text.length}`);
  if (snippet) {
    console.log('Generated snippet:');
    console.log(snippet);
  }
}

main().catch((err) => {
  console.error('Smoke test failed:');
  if (err.response) {
    console.error(err.response.status, err.response.data);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
