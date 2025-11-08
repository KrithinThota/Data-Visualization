import React, { useMemo } from 'react';
import { DataPoint } from '@/types/dashboard';

interface DataTableProps {
  data: DataPoint[];
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, className = '' }) => {
  console.log('DataTable received data:', data.length, 'points');

  const tableData = useMemo(() => {
    return data.slice(0, 100).map((point, index) => ({
      ...point,
      index: index + 1,
      formattedTimestamp: new Date(point.timestamp).toLocaleTimeString(),
      formattedValue: point.value.toFixed(2)
    }));
  }, [data]);

  return (
    <div className={`data-table bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Data Table
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Showing {tableData.length} of {data.length} data points
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Value
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {tableData.map((row) => (
              <tr key={row.index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {row.index}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {row.formattedTimestamp}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {row.formattedValue}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {row.category}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {row.metadata?.source || 'realtime'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {data.length > 100 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing first 100 records. Total records: {data.length.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};