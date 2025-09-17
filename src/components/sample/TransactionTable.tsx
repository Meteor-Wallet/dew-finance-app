export default function TransactionTable() {
  const data = Array.from({ length: 15 }, (_) => ({
    address: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random()
      .toString(16)
      .substring(2, 10)}`,
    operation: Math.random() > 0.5 ? "Deposit" : "Withdraw",
    details: `${(Math.random() * 100).toFixed(2)} NEAR`,
    time: new Date(
      Date.now() - Math.floor(Math.random() * 10000000000)
    ).toLocaleString(),
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray bg-transparent">
        <thead>
          <tr className="border-b border-border-color text-white">
            <th className="py-3 px-4 font-normal">Address</th>
            <th className="py-3 px-4 font-normal">Operation</th>
            <th className="py-3 px-4 font-normal">Details</th>
            <th className="py-3 px-4 font-normal">Time</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-gray-800/40 transition-colors "
            >
              <td className="py-2 px-4 font-mono ">{row.address}</td>
              <td className="py-2 px-4">{row.operation}</td>
              <td className="py-2 px-4">{row.details}</td>
              <td className="py-2 px-4">{row.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
