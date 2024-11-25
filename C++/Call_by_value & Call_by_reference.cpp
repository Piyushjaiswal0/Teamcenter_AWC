#include <iostream>

using namespace std;

void callByValue(int firstValue, int SecondValue){
    int temp = firstValue;
    firstValue = SecondValue;
    SecondValue = temp;
}
void callByReference(int &firstValue, int &SecondValue){
    int temp = firstValue;
    firstValue = SecondValue;
    SecondValue = temp;
}

void callByPointer(int *firstValue, int *SecondValue){
    int temp = *firstValue;
    *firstValue = *SecondValue;
    *SecondValue = temp;
}

int main(){
    int a=20,b=30;
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
    callByValue(a, b);
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;

    a=20,b=30;
    cout << "\nFirstValue: " << a << " SecondValue: " << b << endl;
    callByReference(a, b);
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
    
    a=20,b=30;
    cout << "\nFirstValue: " << a << " SecondValue: " << b << endl;
    callByPointer(&a, &b);
    cout << "FirstValue: " << a << " SecondValue: " << b << endl;
}