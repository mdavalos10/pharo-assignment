using InstrumentDashboard.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddSingleton<IInstrumentService, InstrumentService>();

var app = builder.Build();
// Load and validate the CSV at startup, before accepting requests.
_ = app.Services.GetRequiredService<IInstrumentService>();
app.MapControllers();
app.Run();
