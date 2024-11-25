#include <iostream>

using namespace std;

void callByValue(int firstValue, int secondValue){
    int temp = firstValue;
    firstValue = secondValue;
    secondValue = temp;
}
void callByReference(int &firstValue, int &secondValue){
    int temp = firstValue;
    firstValue = secondValue;
    secondValue = temp;
}

void callByPointer(int *firstValue, int *secondValue){
    int temp = *firstValue;
    *firstValue = *secondValue;
    *secondValue = temp;
}

void swapWithoutTemp(int &firstValue, int &secondValue){
    firstValue = firstValue + secondValue;
    secondValue = firstValue - secondValue;
    firstValue = firstValue - secondValue;
}

void lineBreak(){
    cout << "-------------------------------";
}

int main(){
    int a=20,b=30;
    lineBreak();
    cout << "\ncallByValue (No swapping)" << endl;
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
    callByValue(a, b);
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;

    a=20,b=30;
    lineBreak();
    cout << "\ncallByReference" << endl;
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
    callByReference(a, b);
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
    
    a=20,b=30;
    lineBreak();
    cout << "\ncallByPointer" << endl;
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
    callByPointer(&a, &b);
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
    
    a=20,b=30;
    lineBreak();
    cout << "\nswapWithoutTemp" << endl;
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
    swapWithoutTemp(a, b);
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
}