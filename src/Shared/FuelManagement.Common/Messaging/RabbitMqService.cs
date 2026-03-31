using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace FuelManagement.Common.Messaging;

public interface IRabbitMqService
{
    Task PublishAsync<T>(string queueName, T message);
    Task SubscribeAsync<T>(string queueName, Func<T, Task> onMessageReceived);
}

public class RabbitMqService : IRabbitMqService, IDisposable
{
    private readonly ILogger<RabbitMqService> _logger;
    private readonly ConnectionFactory _factory;
    private IConnection? _connection;
    private IChannel? _channel;

    public RabbitMqService(IConfiguration config, ILogger<RabbitMqService> logger)
    {
        _logger = logger;
        var host = config["RabbitMQ:Host"] ?? "localhost";
        var port = int.Parse(config["RabbitMQ:Port"] ?? "5672");
        _factory = new ConnectionFactory { HostName = host, Port = port, UserName = "guest", Password = "guest" };
    }

    private async Task EnsureConnectionAsync()
    {
        if (_connection == null || !_connection.IsOpen)
        {
            _connection = await _factory.CreateConnectionAsync();
            _channel = await _connection.CreateChannelAsync();
        }
    }

    public async Task PublishAsync<T>(string queueName, T message)
    {
        await EnsureConnectionAsync();
        await _channel!.QueueDeclareAsync(queue: queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
        
        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));
        await _channel.BasicPublishAsync(exchange: string.Empty, routingKey: queueName, body: body);
        _logger.LogInformation("Published message to queue {QueueName}", queueName);
    }

    public async Task SubscribeAsync<T>(string queueName, Func<T, Task> onMessageReceived)
    {
        await EnsureConnectionAsync();
        await _channel!.QueueDeclareAsync(queue: queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (model, ea) =>
        {
            var body = ea.Body.ToArray();
            var message = JsonSerializer.Deserialize<T>(Encoding.UTF8.GetString(body));
            if (message != null)
            {
                await onMessageReceived(message);
            }
            await _channel.BasicAckAsync(deliveryTag: ea.DeliveryTag, multiple: false);
        };

        await _channel.BasicConsumeAsync(queue: queueName, autoAck: false, consumer: consumer);
        _logger.LogInformation("Subscribed to queue {QueueName}", queueName);
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
    }
}
