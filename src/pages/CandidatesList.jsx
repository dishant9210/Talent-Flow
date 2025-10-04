import React, { useEffect, useState } from 'react';
import { List } from 'react-window';

function CandidatesList() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');

  // Example: Fetch from IndexedDB (uncomment if using Dexie/db)
  // useEffect(() => {
  //   db.candidates.toArray().then(setCandidates);
  // }, []);

  // For demo: mock data
  useEffect(() => {
    // Remove this and use db fetch in real app
    const mock = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `Candidate ${i + 1}`,
      email: `candidate${i + 1}@talentflow.com`,
      stage: ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'][i % 6],
    }));
    setCandidates(mock);
  }, []);

  const filtered = candidates.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const Row = ({ index, style }) => {
    const candidate = filtered[index];
    return (
      <div
        style={style}
        className="flex items-center border-b px-4 py-2 hover:bg-indigo-50"
        key={candidate.id}
      >
        <div className="flex-1 font-medium">{candidate.name}</div>
        <div className="flex-1 text-gray-500">{candidate.email}</div>
        <div className="w-32 text-sm text-indigo-700">{candidate.stage}</div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold text-indigo-700 mb-4">Candidates List</h1>
      <input
        className="mb-4 p-2 border rounded w-full max-w-md"
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="border rounded shadow bg-white">
        <div className="flex px-4 py-2 bg-indigo-100 font-semibold">
          <div className="flex-1">Name</div>
          <div className="flex-1">Email</div>
          <div className="w-32">Stage</div>
        </div>
        <List
          height={500}
          rowCount={filtered.length}
          rowHeight={48}
          width="100%"
          rowComponent={Row}
          rowProps={{}}
        />
      </div>
    </div>
  );
}

export default CandidatesList;
