using Dapper;
using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Dapper.Models;
using System.Data;

namespace DocumentService.DataAccess.Dapper
{
    public class Transaction : ITransaction
    {
        private readonly IDbConnection _connection;
        private readonly IDbTransaction _transaction;
        public Transaction(string connectionString, Provider provider)
        {
            _connection = ConnectionFactory.Create(connectionString, provider);

            if (_connection.State != ConnectionState.Open)
            {
                _connection.Open();
            }

            _transaction = _connection.BeginTransaction();
        }
        public void Dispose()
        {
            _transaction.Dispose();
            _connection.Close();
            _connection.Dispose();
        }

        public void Commit()
        {
            _transaction.Commit();
        }

        public void Rollback()
        {
            _transaction.Rollback();
        }

        public async Task Command(IQueryObject queryObject)
        {
            await _connection.ExecuteAsync(queryObject.Sql, queryObject.Params, _transaction, queryObject.CommandTimeout).ConfigureAwait(false);
        }

        public async Task<T> CommandWithResponse<T>(IQueryObject queryObject)
        {
            return await _connection.QueryFirstAsync<T>(queryObject.Sql, queryObject.Params, _transaction, queryObject.CommandTimeout).ConfigureAwait(false);
        }
    }
}
