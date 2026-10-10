using P0_ClassLibrary.Interfaces;

namespace P0_ClassLibrary;

public class CalculatorService : ICalculatorService
{
    public int Add(int a, int b)
    {
        return a + b;
    }

    public double Divide(int a, int b)
    {
        if (b == 0)
            throw new DivideByZeroException("Cannot divide by zero.");
        return (double)a / b;
    }

    public int Multiply(int a, int b)
    {
        return a * b;
    }

    public int Sub(int a, int b)
    {
        return a - b;
    }
}
